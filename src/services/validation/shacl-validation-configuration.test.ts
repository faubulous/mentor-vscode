import { describe, expect, it } from 'vitest';
import {
	findBrokenReferences,
	findDocumentProfileId,
	generateProfileId,
	getAllReferencedShapeUris,
	getDocumentValidationState,
	getMatchingProfiles,
	getProfileDisplayName,
	getRdfExtensionGlob,
	hasBrokenReferences,
	isGlobPattern,
	isValidPathKey,
	matchesPathKey,
	matchesProfilePaths,
	migrateShaclValidationConfig,
	resolveEffectiveShapeGraphs,
	resolveProfileShapes,
	toDocumentPatternKey,
	toUniqueStringArray,
	ShaclDocumentRename,
	ShaclValidationSettings,
} from '@src/services/validation/shacl-validation-configuration';
import {
	isLegacyShaclValidationConfig,
	migrateLegacyShaclValidationConfig,
	LEGACY_DEFAULT_PATHS_KEY,
	LEGACY_DEFAULT_PROFILE_ID,
	LEGACY_DEFAULT_PROFILE_NAME,
	LegacyShaclValidationConfiguration,
} from '@src/services/validation/shacl-validation-migration';

/**
 * The RDF extension list injected into the pure matching functions, mirroring
 * `DocumentFactory.supportedExtensions` filtered to triple sources.
 */
const EXTS = ['.ttl', '.n3', '.nt', '.nq', '.trig', '.rdf'];

describe('shacl-validation-configuration', () => {
	describe('toUniqueStringArray', () => {
		it('keeps first occurrence order and removes non-string/empty values', () => {
			expect(toUniqueStringArray(['a', 'b', 'a', '', '  ', 2, 'c', 'b'] as any)).toEqual(['a', 'b', 'c']);
		});
	});

	describe('generateProfileId', () => {
		it('slugifies the display name', () => {
			expect(generateProfileId('My Core Shapes', [])).toBe('my-core-shapes');
			expect(generateProfileId('models/data.ttl', [])).toBe('models-data-ttl');
		});

		it('disambiguates collisions with a numeric suffix', () => {
			expect(generateProfileId('Core', ['core'])).toBe('core-2');
			expect(generateProfileId('Core', ['core', 'core-2'])).toBe('core-3');
		});

		it('falls back to "profile" for names without usable characters', () => {
			expect(generateProfileId('***', [])).toBe('profile');
			expect(generateProfileId('', ['profile'])).toBe('profile-2');
		});
	});

	describe('getProfileDisplayName', () => {
		it('returns the name field when present and falls back to the id', () => {
			const settings: ShaclValidationSettings = {
				profiles: {
					'core': { name: 'Core Shapes' },
					'extra': {},
				},
			};

			expect(getProfileDisplayName(settings, 'core')).toBe('Core Shapes');
			expect(getProfileDisplayName(settings, 'extra')).toBe('extra');
			expect(getProfileDisplayName(undefined, 'core')).toBe('core');
		});
	});

	describe('isGlobPattern', () => {
		it('detects glob syntax including negation', () => {
			expect(isGlobPattern('*.ttl')).toBe(true);
			expect(isGlobPattern('**/models/*')).toBe(true);
			expect(isGlobPattern('!ontologies/*.ttl')).toBe(true);
			expect(isGlobPattern('models/data.ttl')).toBe(false);
			expect(isGlobPattern('')).toBe(false);
		});
	});

	describe('getRdfExtensionGlob', () => {
		it('builds a brace group for several extensions', () => {
			expect(getRdfExtensionGlob(['.ttl', '.n3'])).toBe('.{ttl,n3}');
		});

		it('returns a plain suffix for a single extension', () => {
			expect(getRdfExtensionGlob(['.ttl'])).toBe('.ttl');
		});

		it('returns an empty string for an empty list', () => {
			expect(getRdfExtensionGlob([])).toBe('');
		});
	});

	describe('isValidPathKey', () => {
		it('accepts relative patterns after normalization', () => {
			expect(isValidPathKey('models/*.ttl')).toBe(true);
			expect(isValidPathKey('./models/*.ttl')).toBe(true);
			expect(isValidPathKey('**')).toBe(true);
		});

		it('accepts exclusion entries with a leading bang', () => {
			expect(isValidPathKey('!models/*.ttl')).toBe(true);
			expect(isValidPathKey('!scratch.ttl')).toBe(true);
			expect(isValidPathKey('!')).toBe(false);
			expect(isValidPathKey('!../secrets/*.ttl')).toBe(false);
		});

		it('rejects empty and traversal-prone patterns', () => {
			expect(isValidPathKey('')).toBe(false);
			expect(isValidPathKey('   ')).toBe(false);
			expect(isValidPathKey('../secrets/*.ttl')).toBe(false);
			expect(isValidPathKey('models/../../etc/*.ttl')).toBe(false);
			expect(isValidPathKey('C:/models/*.ttl')).toBe(false);
		});
	});

	describe('toDocumentPatternKey', () => {
		it('joins path and fragment with a hash', () => {
			expect(toDocumentPatternKey({ path: 'models/data.ttl' })).toBe('models/data.ttl');
			expect(toDocumentPatternKey({ path: 'notebook.mnb', fragment: 'cell-1' })).toBe('notebook.mnb#cell-1');
		});
	});

	describe('matchesPathKey', () => {
		it('trusts patterns with an explicit extension as written', () => {
			expect(matchesPathKey('*.ttl', { path: 'doc.ttl' }, EXTS)).toBe(true);
			expect(matchesPathKey('*.ttl', { path: 'doc.rdf' }, EXTS)).toBe(false);
			expect(matchesPathKey('*.{ttl,rdf}', { path: 'doc.rdf' }, EXTS)).toBe(true);
		});

		it('does not cross path separators with a single star', () => {
			expect(matchesPathKey('*.ttl', { path: 'models/doc.ttl' }, EXTS)).toBe(false);
			expect(matchesPathKey('models/*.ttl', { path: 'models/doc.ttl' }, EXTS)).toBe(true);
			expect(matchesPathKey('models/*.ttl', { path: 'models/sub/doc.ttl' }, EXTS)).toBe(false);
		});

		it('crosses directories with a globstar', () => {
			expect(matchesPathKey('**/*.ttl', { path: 'models/sub/doc.ttl' }, EXTS)).toBe(true);
			expect(matchesPathKey('**/*.ttl', { path: 'doc.ttl' }, EXTS)).toBe(true);
		});

		it('auto-appends the RDF extensions when the last segment has no dot', () => {
			expect(matchesPathKey('**/ontologies/*', { path: 'src/ontologies/foo.ttl' }, EXTS)).toBe(true);
			expect(matchesPathKey('**/ontologies/*', { path: 'src/ontologies/foo.rdf' }, EXTS)).toBe(true);
			expect(matchesPathKey('**/ontologies/*', { path: 'src/ontologies/readme.md' }, EXTS)).toBe(false);
			expect(matchesPathKey('src/*', { path: 'src/foo.ttl' }, EXTS)).toBe(true);
			expect(matchesPathKey('src/*', { path: 'src/sub/foo.ttl' }, EXTS)).toBe(false);
		});

		it('treats a bare trailing globstar as an RDF catch-all', () => {
			expect(matchesPathKey('**', { path: 'doc.ttl' }, EXTS)).toBe(true);
			expect(matchesPathKey('**', { path: 'models/sub/doc.trig' }, EXTS)).toBe(true);
			expect(matchesPathKey('**', { path: 'readme.md' }, EXTS)).toBe(false);
			expect(matchesPathKey('**/*', { path: 'models/doc.ttl' }, EXTS)).toBe(true);
			expect(matchesPathKey('**/*', { path: 'models/readme.md' }, EXTS)).toBe(false);
		});

		it('matches notebook cells of matching files when no fragment is given', () => {
			expect(matchesPathKey('*.mnb', { path: 'nb.mnb', fragment: 'cell-1' }, EXTS)).toBe(true);
			expect(matchesPathKey('*.mnb', { path: 'nb.mnb' }, EXTS)).toBe(true);
		});

		it('matches fragments as globs when the key contains a hash', () => {
			expect(matchesPathKey('nb.mnb#draft-*', { path: 'nb.mnb', fragment: 'draft-1' }, EXTS)).toBe(true);
			expect(matchesPathKey('nb.mnb#draft-*', { path: 'nb.mnb', fragment: 'final' }, EXTS)).toBe(false);
			expect(matchesPathKey('nb.mnb#draft-*', { path: 'nb.mnb' }, EXTS)).toBe(false);
			expect(matchesPathKey('nb.mnb#cell-1', { path: 'nb.mnb', fragment: 'cell-1' }, EXTS)).toBe(true);
		});

		it('normalizes backslashes and leading ./ before matching', () => {
			expect(matchesPathKey('models\\*.ttl', { path: 'models/doc.ttl' }, EXTS)).toBe(true);
			expect(matchesPathKey('./models/*.ttl', { path: 'models/doc.ttl' }, EXTS)).toBe(true);
		});

		it('never matches traversal-prone or empty patterns', () => {
			expect(matchesPathKey('../*.ttl', { path: 'doc.ttl' }, EXTS)).toBe(false);
			expect(matchesPathKey('models/../*.ttl', { path: 'doc.ttl' }, EXTS)).toBe(false);
			expect(matchesPathKey('C:/models/*.ttl', { path: 'models/doc.ttl' }, EXTS)).toBe(false);
			expect(matchesPathKey('', { path: 'doc.ttl' }, EXTS)).toBe(false);
		});
	});

	describe('matchesProfilePaths', () => {
		it('matches when any positive entry matches', () => {
			expect(matchesProfilePaths(['other/*', 'models/*'], { path: 'models/doc.ttl' }, EXTS)).toBe(true);
			expect(matchesProfilePaths(['other/*'], { path: 'models/doc.ttl' }, EXTS)).toBe(false);
		});

		it('subtracts bang exclusions from broader positives', () => {
			expect(matchesProfilePaths(['**/*', '!models/scratch.ttl'], { path: 'models/doc.ttl' }, EXTS)).toBe(true);
			expect(matchesProfilePaths(['**/*', '!models/scratch.ttl'], { path: 'models/scratch.ttl' }, EXTS)).toBe(false);
			expect(matchesProfilePaths(['**/*', '!drafts/**'], { path: 'drafts/wip/doc.ttl' }, EXTS)).toBe(false);
		});

		it('never matches without a positive entry', () => {
			expect(matchesProfilePaths([], { path: 'doc.ttl' }, EXTS)).toBe(false);
			expect(matchesProfilePaths(undefined, { path: 'doc.ttl' }, EXTS)).toBe(false);
			expect(matchesProfilePaths(['!doc.ttl'], { path: 'other.ttl' }, EXTS)).toBe(false);
		});
	});

	describe('getMatchingProfiles', () => {
		it('returns matching profile ids in definition order', () => {
			const settings: ShaclValidationSettings = {
				profiles: {
					'a': { paths: ['models/*'] },
					'b': { paths: ['**/*.ttl'] },
					'c': { paths: ['other/*'] },
					'd': { shapes: ['shape:1'] },
				},
			};

			expect(getMatchingProfiles(settings, { path: 'models/doc.ttl' }, EXTS)).toEqual(['a', 'b']);
		});

		it('returns an empty array without settings', () => {
			expect(getMatchingProfiles({}, { path: 'doc.ttl' }, EXTS)).toEqual([]);
			expect(getMatchingProfiles(undefined, { path: 'doc.ttl' }, EXTS)).toEqual([]);
		});
	});

	describe('findDocumentProfileId', () => {
		it('finds the profile whose paths are exactly the literal document key', () => {
			const settings: ShaclValidationSettings = {
				profiles: {
					'catch-all': { paths: ['**/*'] },
					'models-data-ttl': { paths: ['models/data.ttl'] },
					'multi': { paths: ['models/data.ttl', 'other.ttl'] },
				},
			};

			expect(findDocumentProfileId(settings, 'models/data.ttl')).toBe('models-data-ttl');
		});

		it('normalizes entries before comparing', () => {
			const settings: ShaclValidationSettings = {
				profiles: {
					'doc': { paths: ['./models/data.ttl'] },
				},
			};

			expect(findDocumentProfileId(settings, 'models/data.ttl')).toBe('doc');
		});

		it('returns undefined when no exact single-entry profile exists', () => {
			const settings: ShaclValidationSettings = {
				profiles: { 'catch-all': { paths: ['**/*'] } },
			};

			expect(findDocumentProfileId(settings, 'models/data.ttl')).toBeUndefined();
			expect(findDocumentProfileId(undefined, 'models/data.ttl')).toBeUndefined();
		});
	});

	describe('resolveProfileShapes', () => {
		it('unions shapes of the given profiles and skips unknown ids', () => {
			const settings: ShaclValidationSettings = {
				profiles: {
					'a': { shapes: ['shape:1', 'shape:2'] },
					'b': { shapes: ['shape:2', 'shape:3'] },
				},
			};

			expect(resolveProfileShapes(settings, ['a', 'b', 'missing'])).toEqual(['shape:1', 'shape:2', 'shape:3']);
		});
	});

	describe('resolveEffectiveShapeGraphs', () => {
		it('unions the shapes of every matching profile', () => {
			const settings: ShaclValidationSettings = {
				profiles: {
					'a': { shapes: ['shape:1'], paths: ['models/*'] },
					'b': { shapes: ['shape:2', 'shape:1'], paths: ['**/*.ttl'] },
					'c': { shapes: ['shape:3'], paths: ['other/*'] },
				},
			};

			expect(resolveEffectiveShapeGraphs(settings, { path: 'models/doc.ttl' }, EXTS)).toEqual(['shape:1', 'shape:2']);
		});

		it('returns an empty list when nothing matches', () => {
			const settings: ShaclValidationSettings = {
				profiles: { 'a': { shapes: ['shape:1'], paths: ['other/*'] } },
			};

			expect(resolveEffectiveShapeGraphs(settings, { path: 'doc.ttl' }, EXTS)).toEqual([]);
		});

		it('respects bang exclusions', () => {
			const settings: ShaclValidationSettings = {
				profiles: {
					'a': { shapes: ['shape:1'], paths: ['**/*', '!models/doc.ttl'] },
					'b': { shapes: ['shape:2'], paths: ['models/doc.ttl'] },
				},
			};

			expect(resolveEffectiveShapeGraphs(settings, { path: 'models/doc.ttl' }, EXTS)).toEqual(['shape:2']);
			expect(resolveEffectiveShapeGraphs(settings, { path: 'models/other.ttl' }, EXTS)).toEqual(['shape:1']);
		});
	});

	describe('getDocumentValidationState', () => {
		it('returns matched mode with the matched path entries', () => {
			const settings: ShaclValidationSettings = {
				profiles: {
					'a': { shapes: ['shape:1'], paths: ['models/*', '**/*.ttl'] },
					'b': { shapes: ['shape:2'], paths: ['**/*.ttl'] },
					'c': { shapes: ['shape:3'], paths: ['other/*'] },
				},
			};

			const state = getDocumentValidationState(settings, { path: 'models/doc.ttl' }, EXTS);

			expect(state.mode).toBe('matched');
			expect(state.profileNames).toEqual(['a', 'b']);
			expect(state.effectiveShapes).toEqual(['shape:1', 'shape:2']);
			expect(state.matchedPaths).toEqual(['models/*', '**/*.ttl']);
		});

		it('excludes profiles whose bang entries match', () => {
			const settings: ShaclValidationSettings = {
				profiles: {
					'a': { shapes: ['shape:1'], paths: ['**/*', '!doc.ttl'] },
				},
			};

			const state = getDocumentValidationState(settings, { path: 'doc.ttl' }, EXTS);

			expect(state.mode).toBe('none');
			expect(state.profileNames).toEqual([]);
			expect(state.effectiveShapes).toEqual([]);
			expect(state.matchedPaths).toEqual([]);
		});

		it('returns none mode when nothing applies', () => {
			const settings: ShaclValidationSettings = {
				profiles: { 'a': { shapes: ['shape:1'], paths: ['other/*'] } },
			};

			const state = getDocumentValidationState(settings, { path: 'doc.ttl' }, EXTS);

			expect(state.mode).toBe('none');
			expect(state.profileNames).toEqual([]);
			expect(state.effectiveShapes).toEqual([]);
			expect(state.matchedPaths).toEqual([]);
		});
	});

	describe('getAllReferencedShapeUris', () => {
		it('collects unique shape URIs from the profiles', () => {
			const settings: ShaclValidationSettings = {
				profiles: {
					'a': { shapes: ['shape:1', 'shape:2'] },
					'b': { shapes: ['shape:2', 'shape:3'] },
				},
			};

			expect(getAllReferencedShapeUris(settings)).toEqual(['shape:1', 'shape:2', 'shape:3']);
		});
	});

	describe('findBrokenReferences', () => {
		it('reports missing shape files per profile', () => {
			const settings: ShaclValidationSettings = {
				profiles: {
					'a': { shapes: ['shape:ok', 'shape:missing'] },
					'b': { shapes: ['shape:ok'] },
				},
			};

			const broken = findBrokenReferences(settings, uri => uri === 'shape:ok');

			expect(broken.profiles).toEqual({ 'a': ['shape:missing'] });
			expect(hasBrokenReferences(broken)).toBe(true);
		});

		it('returns empty results for healthy settings', () => {
			const settings: ShaclValidationSettings = {
				profiles: { 'a': { shapes: ['shape:ok'], paths: ['**/*'] } },
			};

			const broken = findBrokenReferences(settings, () => true);

			expect(broken.profiles).toEqual({});
			expect(hasBrokenReferences(broken)).toBe(false);
		});
	});

	describe('migrateShaclValidationConfig', () => {
		const rename = (oldPath: string, newPath: string): ShaclDocumentRename => ({
			oldUri: `workspace:///${oldPath}`,
			newUri: `workspace:///${newPath}`,
			oldPath,
			newPath,
		});

		it('returns an empty object for undefined settings', () => {
			expect(migrateShaclValidationConfig(undefined, [rename('a.ttl', 'b.ttl')])).toEqual({});
		});

		it('returns settings unchanged when no renames match', () => {
			const settings: ShaclValidationSettings = {
				profiles: { 'a': { shapes: ['workspace:///shapes.ttl'], paths: ['models/*'] } },
			};

			const result = migrateShaclValidationConfig(settings, [rename('other.ttl', 'new.ttl')]);

			expect(result.profiles?.['a'].shapes).toEqual(['workspace:///shapes.ttl']);
			expect(result.profiles?.['a'].paths).toEqual(['models/*']);
		});

		it('migrates shape URIs and literal path entries', () => {
			const settings: ShaclValidationSettings = {
				profiles: {
					'a': { name: 'A', shapes: ['workspace:///shapes/old.ttl'], paths: ['models/data.ttl'] },
				},
			};

			const result = migrateShaclValidationConfig(settings, [
				rename('shapes/old.ttl', 'shapes/new.ttl'),
				rename('models/data.ttl', 'models/renamed.ttl'),
			]);

			expect(result.profiles?.['a']).toEqual({
				name: 'A',
				shapes: ['workspace:///shapes/new.ttl'],
				paths: ['models/renamed.ttl'],
			});
		});

		it('rewrites entries under a renamed folder without touching sibling prefixes', () => {
			const settings: ShaclValidationSettings = {
				profiles: {
					'a': {
						shapes: ['workspace:///models/shapes.ttl'],
						paths: ['models/x.ttl', 'models/sub/**', 'models-extra/b.ttl'],
					},
				},
			};

			const result = migrateShaclValidationConfig(settings, [rename('models', 'renamed')]);

			expect(result.profiles?.['a'].shapes).toEqual(['workspace:///renamed/shapes.ttl']);
			expect(result.profiles?.['a'].paths).toEqual(['renamed/x.ttl', 'renamed/sub/**', 'models-extra/b.ttl']);
		});

		it('migrates fragment-qualified entries on a file rename', () => {
			const settings: ShaclValidationSettings = {
				profiles: { 'a': { paths: ['notebook.mnb#cell-1'] } },
			};

			const result = migrateShaclValidationConfig(settings, [rename('notebook.mnb', 'renamed.mnb')]);

			expect(result.profiles?.['a'].paths).toEqual(['renamed.mnb#cell-1']);
		});

		it('rewrites the literal base of folder-scoped patterns and preserves exclusions', () => {
			const settings: ShaclValidationSettings = {
				profiles: {
					'a': { paths: ['ontologies/*.ttl', '!ontologies/scratch.ttl'] },
				},
			};

			const result = migrateShaclValidationConfig(settings, [rename('ontologies', 'vocabularies')]);

			expect(result.profiles?.['a'].paths).toEqual(['vocabularies/*.ttl', '!vocabularies/scratch.ttl']);
		});

		it('leaves root-anchored patterns without a literal base untouched', () => {
			const settings: ShaclValidationSettings = {
				profiles: {
					'a': { paths: ['**/*.ttl', '*.ttl'] },
				},
			};

			const result = migrateShaclValidationConfig(settings, [rename('models', 'renamed')]);

			expect(result.profiles?.['a'].paths).toEqual(['**/*.ttl', '*.ttl']);
		});
	});
});

describe('shacl-validation-migration', () => {
	describe('isLegacyShaclValidationConfig', () => {
		it('detects the legacy shape', () => {
			expect(isLegacyShaclValidationConfig({ defaults: [] })).toBe(true);
			expect(isLegacyShaclValidationConfig({ graphs: {} })).toBe(true);
			expect(isLegacyShaclValidationConfig({ defaults: [], graphs: {} })).toBe(true);
		});

		it('rejects profile-based, intermediate and empty values', () => {
			expect(isLegacyShaclValidationConfig({ profiles: {} })).toBe(false);
			expect(isLegacyShaclValidationConfig({ documents: {} })).toBe(false);
			expect(isLegacyShaclValidationConfig({ paths: {} })).toBe(false);
			expect(isLegacyShaclValidationConfig({ defaults: [], profiles: {} })).toBe(false);
			expect(isLegacyShaclValidationConfig({})).toBe(false);
			expect(isLegacyShaclValidationConfig(undefined)).toBe(false);
		});
	});

	describe('migrateLegacyShaclValidationConfig', () => {
		it('converts defaults into a catch-all profile', () => {
			const legacy: LegacyShaclValidationConfiguration = {
				defaults: ['workspace:///shapes/core.ttl'],
			};

			expect(migrateLegacyShaclValidationConfig(legacy)).toEqual({
				profiles: {
					[LEGACY_DEFAULT_PROFILE_ID]: {
						name: LEGACY_DEFAULT_PROFILE_NAME,
						shapes: ['workspace:///shapes/core.ttl'],
						paths: [LEGACY_DEFAULT_PATHS_KEY],
					},
				},
			});
		});

		it('drops graph entries equivalent to implicit defaults behavior', () => {
			const legacy: LegacyShaclValidationConfiguration = {
				defaults: ['shape:1'],
				graphs: {
					'workspace:///doc.ttl': { includeDefaults: true, includeShapes: [], excludeShapes: [] },
				},
			};

			const result = migrateLegacyShaclValidationConfig(legacy);

			expect(Object.keys(result.profiles ?? {})).toEqual([LEGACY_DEFAULT_PROFILE_ID]);
		});

		it('converts additive entries into an auto profile named after the path', () => {
			const legacy: LegacyShaclValidationConfiguration = {
				defaults: ['shape:default'],
				graphs: {
					'workspace:///models/doc.ttl': { includeDefaults: true, includeShapes: ['shape:extra'] },
				},
			};

			const result = migrateLegacyShaclValidationConfig(legacy);

			expect(result.profiles?.['models-doc-ttl']).toEqual({
				name: 'models/doc.ttl',
				shapes: ['shape:extra'],
				paths: ['models/doc.ttl'],
			});
			// The catch-all Default profile still contributes the defaults.
			expect(result.profiles?.[LEGACY_DEFAULT_PROFILE_ID].paths).toEqual([LEGACY_DEFAULT_PATHS_KEY]);
		});

		it('excludes the defaults and freezes own shapes for includeDefaults:false entries', () => {
			const legacy: LegacyShaclValidationConfiguration = {
				defaults: ['shape:default'],
				graphs: {
					'workspace:///doc.ttl': { includeDefaults: false, includeShapes: ['shape:1'] },
				},
			};

			const result = migrateLegacyShaclValidationConfig(legacy);

			expect(result.profiles?.['doc-ttl']).toEqual({
				name: 'doc.ttl',
				shapes: ['shape:1'],
				paths: ['doc.ttl'],
			});
			expect(result.profiles?.[LEGACY_DEFAULT_PROFILE_ID].paths).toEqual([LEGACY_DEFAULT_PATHS_KEY, '!doc.ttl']);
		});

		it('freezes fully-resolved shapes for entries with exclusions', () => {
			const legacy: LegacyShaclValidationConfiguration = {
				defaults: ['shape:default-1', 'shape:default-2'],
				graphs: {
					'workspace:///doc.ttl': {
						includeDefaults: true,
						includeShapes: ['shape:extra'],
						excludeShapes: ['shape:default-2'],
					},
				},
			};

			const result = migrateLegacyShaclValidationConfig(legacy);

			expect(result.profiles?.['doc-ttl']).toEqual({
				name: 'doc.ttl',
				shapes: ['shape:default-1', 'shape:extra'],
				paths: ['doc.ttl'],
			});
			expect(result.profiles?.[LEGACY_DEFAULT_PROFILE_ID].paths).toEqual([LEGACY_DEFAULT_PATHS_KEY, '!doc.ttl']);
		});

		it('converts disable-only entries into a bare default exclusion', () => {
			const legacy: LegacyShaclValidationConfiguration = {
				defaults: ['shape:default'],
				graphs: {
					'workspace:///doc.ttl': { includeDefaults: false, includeShapes: [] },
				},
			};

			const result = migrateLegacyShaclValidationConfig(legacy);

			expect(Object.keys(result.profiles ?? {})).toEqual([LEGACY_DEFAULT_PROFILE_ID]);
			expect(result.profiles?.[LEGACY_DEFAULT_PROFILE_ID].paths).toEqual([LEGACY_DEFAULT_PATHS_KEY, '!doc.ttl']);
		});

		it('creates auto profiles without a Default profile when no defaults exist', () => {
			const legacy: LegacyShaclValidationConfiguration = {
				graphs: {
					'workspace:///doc.ttl': { includeDefaults: true, includeShapes: ['shape:1'] },
				},
			};

			expect(migrateLegacyShaclValidationConfig(legacy)).toEqual({
				profiles: {
					'doc-ttl': { name: 'doc.ttl', shapes: ['shape:1'], paths: ['doc.ttl'] },
				},
			});
		});

		it('decodes percent-encoded characters and keeps fragments in document keys', () => {
			const legacy: LegacyShaclValidationConfiguration = {
				graphs: {
					'workspace:///my%20models/doc.ttl': { includeDefaults: false, includeShapes: ['shape:1'] },
					'workspace:///notebook.mnb#cell-1': { includeDefaults: false, includeShapes: ['shape:2'] },
				},
			};

			const result = migrateLegacyShaclValidationConfig(legacy);

			expect(result.profiles?.['my-models-doc-ttl']).toEqual({
				name: 'my models/doc.ttl',
				shapes: ['shape:1'],
				paths: ['my models/doc.ttl'],
			});
			expect(result.profiles?.['notebook-mnb-cell-1']).toEqual({
				name: 'notebook.mnb#cell-1',
				shapes: ['shape:2'],
				paths: ['notebook.mnb#cell-1'],
			});
		});
	});
});
