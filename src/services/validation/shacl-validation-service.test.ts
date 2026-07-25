import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const { ValidatorMock } = vi.hoisted(() => {
	const ValidatorMock = vi.fn(function (this: any) {
		this.validate = vi.fn(async () => ({ conforms: true, dataset: {}, results: [] }));
	});

	return { ValidatorMock };
});

vi.mock('shacl-engine', () => ({ Validator: ValidatorMock }));

import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { ShaclSettingsSyncService } from '@src/services/validation/shacl-settings-sync-service';
import { ShaclValidationSettings } from '@src/services/validation/shacl-validation-configuration';
import { WorkspaceUri } from '@src/providers/workspace-uri';

/**
 * Constructs the service with minimal mocks and a configuration double whose
 * `inspect().workspaceValue` returns the given settings and whose `update` calls
 * are recorded.
 */
function createService(settings: ShaclValidationSettings, globals?: ShaclValidationSettings, hasGraph: (uri: string) => boolean = () => false) {
	const updates: { key: string; value: any; target: number }[] = [];

	(vscode.workspace as any).getConfiguration = vi.fn(() => ({
		get: (_key: string, defaultValue?: any) => settings ?? defaultValue,
		inspect: (_key: string) => ({ globalValue: globals, workspaceValue: settings }),
		update: async (key: string, value: any, target: number) => { updates.push({ key, value, target }); },
	}));

	const context = { subscriptions: [] } as any;
	const store = { hasGraph } as any;
	const contextService = { contexts: {}, onDidChangeDocumentContext: () => ({ dispose: () => {} }) } as any;
	const documentFactory = {
		supportedExtensions: {
			'.ttl': { language: 'turtle', isTripleSource: true },
			'.rdf': { language: 'xml', isTripleSource: true },
			'.sparql': { language: 'sparql', isTripleSource: false },
			'.mnb': { language: 'json', isTripleSource: false },
		},
	} as any;

	const service = new ShaclValidationService(context, store, contextService, documentFactory);

	return { service, updates };
}

beforeEach(() => {
	vi.clearAllMocks();
	(vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.parse('file:///w'), name: 'w', index: 0 }];
	(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);
	(vscode.commands as any).executeCommand = vi.fn(async () => undefined);
	WorkspaceUri.rootUri = undefined;
});

describe('ShaclValidationService.getDocumentLocation', () => {
	it('returns the bare workspace-relative path without a leading slash', () => {
		const { service } = createService({});

		expect(service.getDocumentLocation(vscode.Uri.parse('file:///w/models/data.ttl')))
			.toEqual({ path: 'models/data.ttl', fragment: undefined });
	});

	it('carries the fragment for notebook cell URIs', () => {
		const { service } = createService({});

		expect(service.getDocumentLocation(vscode.Uri.parse('file:///w/nb.mnb#cell-1')))
			.toEqual({ path: 'nb.mnb', fragment: 'cell-1' });
	});

	it('falls back to an inert full-URI path for documents outside the workspace', () => {
		const { service } = createService({});

		expect(service.getDocumentLocation(vscode.Uri.parse('file:///other/data.ttl')))
			.toEqual({ path: 'file:///other/data.ttl' });
	});

	it('resolves a notebook cell URI to its slug-based location, not the opaque handle', () => {
		const { service } = createService({});

		// A live cell URI carries VS Code's opaque handle as its fragment; the loaded
		// context exposes the slug-based graph IRI, which is what profiles are written against.
		const cellUri = vscode.Uri.parse('vscode-notebook-cell:///w/nb.mnb#W0sZmlsZQ==');
		(service as any)._contextService.contexts[cellUri.toString()] = {
			uri: cellUri,
			graphIri: vscode.Uri.parse('workspace:///nb.mnb#cell-3'),
		};

		expect(service.getDocumentLocation(cellUri)).toEqual({ path: 'nb.mnb', fragment: 'cell-3' });
	});

	it('falls back to the raw cell fragment when no context is loaded', () => {
		const { service } = createService({});

		expect(service.getDocumentLocation(vscode.Uri.parse('vscode-notebook-cell:///w/nb.mnb#W0sZmlsZQ==')))
			.toEqual({ path: 'nb.mnb', fragment: 'W0sZmlsZQ==' });
	});
});

describe('ShaclValidationService.getRdfExtensions', () => {
	it('returns only triple-source extensions', () => {
		const { service } = createService({});

		expect(service.getRdfExtensions()).toEqual(['.ttl', '.rdf']);
	});
});

describe('ShaclValidationService.getEffectiveShapeGraphs', () => {
	it('resolves the profiles whose paths match the document', () => {
		const { service } = createService({
			profiles: {
				'core': { name: 'Core', shapes: ['workspace:///shapes/core.ttl'], includeFiles: ['models/*'] },
			},
		});

		expect(service.getEffectiveShapeGraphs(vscode.Uri.parse('file:///w/models/data.ttl')))
			.toEqual(['workspace:///shapes/core.ttl']);
		expect(service.getEffectiveShapeGraphs(vscode.Uri.parse('file:///w/other/data.ttl')))
			.toEqual([]);
	});

	it('respects bang exclusions', () => {
		const { service } = createService({
			profiles: {
				'core': { shapes: ['workspace:///shapes/core.ttl'], includeFiles: ['**/*'], excludeFiles: ['models/data.ttl'] },
			},
		});

		expect(service.getEffectiveShapeGraphs(vscode.Uri.parse('file:///w/models/data.ttl')))
			.toEqual([]);
	});

	it('resolves profiles stored in the user scope', () => {
		const { service } = createService(
			{},
			{
				profiles: {
					'skos': { name: 'SKOS', shapes: ['http://www.w3.org/2004/02/skos/core#'], includeFiles: ['**/*'] },
				},
			}
		);

		expect(service.getEffectiveShapeGraphs(vscode.Uri.parse('file:///w/models/data.ttl')))
			.toEqual(['http://www.w3.org/2004/02/skos/core#']);
	});

	it('lets workspace profiles shadow same-id user profiles', () => {
		const { service } = createService(
			{
				profiles: {
					'skos': { name: 'My SKOS', shapes: ['workspace:///shapes/skos.ttl'], includeFiles: ['**/*'] },
				},
			},
			{
				profiles: {
					'skos': { name: 'SKOS', shapes: ['http://www.w3.org/2004/02/skos/core#'], includeFiles: ['**/*'] },
				},
			}
		);

		expect(service.getEffectiveShapeGraphs(vscode.Uri.parse('file:///w/models/data.ttl')))
			.toEqual(['workspace:///shapes/skos.ttl']);
	});

	it('resolves no shape graphs for a profile without paths', () => {
		const { service } = createService({
			profiles: {
				'ontology': { name: 'Basic Ontology', shapes: ['https://w3id.org/mentor/shacl/profiles/ontology'] },
			},
		});

		expect(service.getEffectiveShapeGraphs(vscode.Uri.parse('file:///w/models/data.ttl')))
			.toEqual([]);
	});
});

describe('ShaclValidationService.checkShaclProfiles', () => {
	const settings: ShaclValidationSettings = {
		profiles: {
			'ontology': { name: 'Basic Ontology', shapes: ['https://w3id.org/mentor/shacl/profiles/ontology'] },
		},
	};

	it('reports a profile shape graph clean when it is loaded in the store', async () => {
		const { service } = createService(settings, undefined, () => true);

		expect(await service.checkShaclProfiles()).toEqual({ profiles: {} });
	});

	it('reports a profile shape graph missing when it is not in the store', async () => {
		const { service } = createService(settings, undefined, () => false);

		expect(await service.checkShaclProfiles()).toEqual({
			profiles: { 'ontology': ['https://w3id.org/mentor/shacl/profiles/ontology'] },
		});
	});

	it('loads referenced workspace shape graphs on demand before deciding (ADR-0003)', async () => {
		const workspaceShape = 'workspace:///.mentor/shapes/ontology.ttl';
		const loaded = new Set<string>();
		const store = { hasGraph: (uri: string) => loaded.has(uri) } as any;
		const profileSettings = {
			getMergedSettings: () => ({
				profiles: { 'ontology': { name: 'Ontology', shapes: [workspaceShape] } },
			}),
		} as any;

		// The ensure callback simulates a successful on-demand load into the store.
		const sync = new ShaclSettingsSyncService(store, profileSettings, undefined, async uris => {
			for (const uri of uris) {
				loaded.add(uri);
			}
		});

		expect(await sync.checkShaclProfiles()).toEqual({ profiles: {} });
	});

	it('reports a shape graph broken when the on-demand load cannot provide it', async () => {
		const workspaceShape = 'workspace:///.mentor/shapes/deleted.ttl';
		const store = { hasGraph: () => false } as any;
		const profileSettings = {
			getMergedSettings: () => ({
				profiles: { 'ontology': { name: 'Ontology', shapes: [workspaceShape] } },
			}),
		} as any;

		// The ensure callback resolves without loading anything (file missing or unparsable).
		const sync = new ShaclSettingsSyncService(store, profileSettings, undefined, async () => { });

		expect(await sync.checkShaclProfiles()).toEqual({
			profiles: { 'ontology': [workspaceShape] },
		});
	});

	it('shows a configuration error on the status bar for broken references and clears it on a clean check', async () => {
		const texts: string[] = [];
		const originalCreate = (vscode.window as any).createStatusBarItem;
		(vscode.window as any).createStatusBarItem = vi.fn(() => {
			let value = '';
			return {
				get text() { return value; },
				set text(v: string) { value = v; texts.push(v); },
				tooltip: '', command: undefined, show: () => { }, hide: () => { }, dispose: () => { },
			};
		});

		try {
			let hasGraph = false;
			const { service } = createService(settings, undefined, () => hasGraph);

			await service.checkShaclProfiles();

			expect(texts[texts.length - 1]).toBe('$(warning) Configuration error');

			// The missing shape graph appears (e.g. the file is restored) — the next
			// check clears the error and, while SHACL is enabled and no run summary
			// exists yet, falls back to the baseline "0 files" indicator.
			hasGraph = true;

			await service.checkShaclProfiles();

			expect(texts[texts.length - 1]).toBe('$(checklist) Validated 0 files');
		} finally {
			(vscode.window as any).createStatusBarItem = originalCreate;
		}
	});
});

describe('ShaclValidationService.validateProfile', () => {
	const files = [
		vscode.Uri.parse('file:///w/models/a.ttl'),
		vscode.Uri.parse('file:///w/other/b.ttl'),
	];

	it('matches files by the profile paths (no contexts loaded → validated 0)', async () => {
		const { service } = createService({
			profiles: { 'core': { shapes: ['workspace:///shapes/core.ttl'], includeFiles: ['**/*'] } },
		});

		const summary = await service.validateProfile('core', files);

		expect(summary.matched).toBe(2);
		expect(summary.validated).toBe(0);
		expect(summary.hasShapes).toBe(true);
	});

	it('honors excludeFiles', async () => {
		const { service } = createService({
			profiles: { 'core': { shapes: ['s:1'], includeFiles: ['**/*'], excludeFiles: ['other/b.ttl'] } },
		});

		expect((await service.validateProfile('core', files)).matched).toBe(1);
	});

	it('reports no shapes when the profile has none', async () => {
		const { service } = createService({
			profiles: { 'core': { includeFiles: ['**/*'] } },
		});

		const summary = await service.validateProfile('core', files);

		expect(summary.hasShapes).toBe(false);
		expect(summary.matched).toBe(0);
	});

	it('returns an empty summary for an unknown profile', async () => {
		const { service } = createService({});

		expect(await service.validateProfile('nope', files)).toEqual({
			matched: 0, validated: 0, issues: 0, errors: 0, warnings: 0, issueFiles: [], hasShapes: false, skipped: 0,
		});
	});
});

/**
 * Builds a service whose profile matches every file, with a loaded context per file
 * and a store whose `getDataset(...).size` is driven by the per-graph `sizes` map, so
 * batch validation actually runs `_validateAndPublish` and the large-graph guard can
 * be exercised. `maxGraphSize` seeds `mentor.shacl.maxGraphSize`.
 */
function createBatchService(sizes: Record<string, number>, maxGraphSize?: number) {
	(vscode.workspace as any).getConfiguration = vi.fn(() => ({
		get: (key: string, defaultValue?: any) => key === 'maxGraphSize' ? (maxGraphSize ?? defaultValue) : defaultValue,
		inspect: (key: string) => key === 'validation'
			? { globalValue: undefined, workspaceValue: { profiles: { all: { shapes: ['s:1'], includeFiles: ['**/*'] } } } }
			: {},
		update: async () => { },
	}));

	const context = { subscriptions: [] } as any;
	const store = {
		hasGraph: () => true,
		getGraphVersion: vi.fn(() => 0),
		getDataset: vi.fn((graphs: string[]) => ({ size: sizes[graphs[0]] ?? 0 })),
	} as any;

	const contexts: Record<string, any> = {};
	const contextService = {
		contexts,
		onDidChangeDocumentContext: () => ({ dispose: () => { } }),
	} as any;
	const documentFactory = {
		supportedExtensions: { '.ttl': { language: 'turtle', isTripleSource: true } },
	} as any;

	const service = new ShaclValidationService(context, store, contextService, documentFactory);
	const files = Object.keys(sizes).map(uri => vscode.Uri.parse(uri));

	// Register a loaded context (with its own single graph) for every file.
	for (const uri of files) {
		contexts[uri.toString()] = { graphs: [uri.toString()], subjects: {}, references: {} };
	}

	return { service, store, files };
}

describe('ShaclValidationService batch cooperative behaviour', () => {
	const A = 'file:///w/a.ttl';
	const B = 'file:///w/big.ttl';

	it('skips data graphs above mentor.shacl.maxGraphSize on automatic runs', async () => {
		const { service } = createBatchService({ [A]: 10, [B]: 100_000 }, 50_000);

		const summary = await service.validateAllProfiles([vscode.Uri.parse(A), vscode.Uri.parse(B)]);

		expect(summary.matched).toBe(2);
		expect(summary.validated).toBe(1);
		expect(summary.skipped).toBe(1);
	});

	it('validates oversized graphs when the caller opts out of the size guard', async () => {
		const { service } = createBatchService({ [A]: 10, [B]: 100_000 }, 50_000);

		const summary = await service.validateAllProfiles(
			[vscode.Uri.parse(A), vscode.Uri.parse(B)],
			{ skipLargeGraphs: false }
		);

		expect(summary.validated).toBe(2);
		expect(summary.skipped).toBe(0);
	});

	it('treats maxGraphSize=0 as disabling the guard', async () => {
		const { service } = createBatchService({ [A]: 10, [B]: 100_000 }, 0);

		const summary = await service.validateAllProfiles([vscode.Uri.parse(A), vscode.Uri.parse(B)]);

		expect(summary.validated).toBe(2);
		expect(summary.skipped).toBe(0);
	});

	it('logs validated files by URI, and logs skipped files (oversized and unindexed)', async () => {
		const logs: string[] = [];
		const originalCreate = (vscode.window as any).createOutputChannel;
		(vscode.window as any).createOutputChannel = vi.fn(() => ({
			info: (m: string) => logs.push(m), error: () => { }, warn: () => { }, trace: () => { }, debug: () => { },
			append: () => { }, appendLine: () => { }, clear: () => { }, dispose: () => { }, show: () => { }, hide: () => { },
		}));

		try {
			// A is small (validated), B is oversized (size-skipped); C matches but has no context.
			const { service } = createBatchService({ [A]: 10, [B]: 100_000 }, 50_000);
			const C = 'file:///w/c.ttl';

			await service.validateAllProfiles([vscode.Uri.parse(A), vscode.Uri.parse(B), vscode.Uri.parse(C)]);

			expect(logs).toContainEqual(expect.stringMatching(new RegExp(`^Validated ${A}: \\d+ms`)));
			expect(logs).toContainEqual(`Skipped ${B}: data graph exceeds mentor.shacl.maxGraphSize (50000).`);
			expect(logs).toContainEqual(`Skipped ${C}: no document context (not indexed).`);
		} finally {
			(vscode.window as any).createOutputChannel = originalCreate;
		}
	});

	it('stops early and reports cancellation when cancelActiveValidation is called mid-batch', async () => {
		const { service } = createBatchService({ [A]: 10, [B]: 10 });

		// Cancel from inside the first file's validate(); the shared validator is reused for
		// both files, so the next iteration's token check breaks the loop.
		let call = 0;
		ValidatorMock.mockImplementationOnce(function (this: any) {
			this.validate = vi.fn(async () => {
				if (++call === 1) {
					service.cancelActiveValidation();
				}

				return { conforms: true, dataset: {}, results: [] };
			});
		});

		const summary = await service.validateAllProfiles([vscode.Uri.parse(A), vscode.Uri.parse(B)]);

		expect(summary.cancelled).toBe(true);
		expect(summary.validated).toBe(1);
	});

	it('logs per-file validation time to the Mentor Validation channel', async () => {
		const infoSpy = vi.fn();
		const originalCreate = (vscode.window as any).createOutputChannel;
		(vscode.window as any).createOutputChannel = vi.fn(() => ({
			info: infoSpy, error: () => { }, warn: () => { }, trace: () => { }, debug: () => { },
			append: () => { }, appendLine: () => { }, clear: () => { }, dispose: () => { }, show: () => { }, hide: () => { },
		}));

		try {
			const { service } = createBatchService({ [A]: 10 });

			await service.validateAllProfiles([vscode.Uri.parse(A)]);

			expect(infoSpy).toHaveBeenCalledWith(expect.stringMatching(/^Validated .+: \d+ms, 10 triples, 0 issues$/));
		} finally {
			(vscode.window as any).createOutputChannel = originalCreate;
		}
	});

	it('shows indexer-style progress on the status bar item and a persistent summary when the batch ends', async () => {
		const texts: string[] = [];
		let shown = 0;
		const originalCreate = (vscode.window as any).createStatusBarItem;
		(vscode.window as any).createStatusBarItem = vi.fn(() => {
			let value = '';
			return {
				get text() { return value; },
				set text(v: string) { value = v; texts.push(v); },
				tooltip: '', command: undefined, show: () => { shown++; }, hide: () => { }, dispose: () => { },
			};
		});

		try {
			const { service } = createBatchService({ [A]: 10, [B]: 10 });

			await service.validateAllProfiles([vscode.Uri.parse(A), vscode.Uri.parse(B)]);

			expect(texts).toContain('$(sync~spin) Validating: 1 of 2 files...');
			expect(texts).toContain('$(sync~spin) Validating: 2 of 2 files...');
			// The item stays visible with a summary of the run, mirroring the indexer.
			expect(shown).toBeGreaterThan(0);
			expect(texts[texts.length - 1]).toBe('$(checklist) Validated 2 files');
		} finally {
			(vscode.window as any).createStatusBarItem = originalCreate;
		}
	});

	it('includes the skipped count in the status bar summary', async () => {
		const texts: string[] = [];
		const originalCreate = (vscode.window as any).createStatusBarItem;
		(vscode.window as any).createStatusBarItem = vi.fn(() => {
			let value = '';
			return {
				get text() { return value; },
				set text(v: string) { value = v; texts.push(v); },
				tooltip: '', command: undefined, show: () => { }, hide: () => { }, dispose: () => { },
			};
		});

		try {
			const { service } = createBatchService({ [A]: 10, [B]: 100_000 }, 50_000);

			await service.validateAllProfiles([vscode.Uri.parse(A), vscode.Uri.parse(B)]);

			expect(texts[texts.length - 1]).toBe('$(checklist) Validated 1 files; 1 skipped');
		} finally {
			(vscode.window as any).createStatusBarItem = originalCreate;
		}
	});

	it('records a skip for oversized files and clears it after an explicit validation', async () => {
		const { service } = createBatchService({ [A]: 10, [B]: 100_000 }, 50_000);

		await service.validateAllProfiles([vscode.Uri.parse(A), vscode.Uri.parse(B)]);

		expect(service.getLastSkip(vscode.Uri.parse(A))).toBeUndefined();
		expect(service.getLastSkip(vscode.Uri.parse(B))).toEqual({ triples: 100_000, maxGraphSize: 50_000 });

		// An explicit run opts out of the size guard and supersedes the skip.
		await service.validateAllProfiles([vscode.Uri.parse(B)], { skipLargeGraphs: false });

		expect(service.getLastSkip(vscode.Uri.parse(B))).toBeUndefined();
	});

	it('coalesces onDidValidate to a single fire per batch when a document is active', async () => {
		const { service } = createBatchService({ [A]: 10, [B]: 10 });
		(service as any)._contextService.activeContext = { uri: vscode.Uri.parse(A) };

		const fired: string[] = [];
		service.onDidValidate((uri: any) => fired.push(uri.toString()));

		const summary = await service.validateAllProfiles([vscode.Uri.parse(A), vscode.Uri.parse(B)]);

		expect(summary.validated).toBe(2);
		// One coalesced fire, not one per validated file.
		expect(fired).toHaveLength(1);
	});

	it('suppresses onDidValidate entirely for a batch when no document is active', async () => {
		const { service } = createBatchService({ [A]: 10, [B]: 10 });
		(service as any)._contextService.activeContext = undefined;

		const fired: string[] = [];
		service.onDidValidate(() => fired.push('x'));

		const summary = await service.validateAllProfiles([vscode.Uri.parse(A), vscode.Uri.parse(B)]);

		expect(summary.validated).toBe(2);
		expect(fired).toHaveLength(0);
	});

	it('yields a macrotask to the event loop once the time budget is exceeded', async () => {
		const { service } = createBatchService({ 'file:///w/a.ttl': 10, 'file:///w/b.ttl': 10, 'file:///w/c.ttl': 10 });

		const yieldSpy = vi.spyOn((service as any)._batchRunner, '_yieldToEventLoop');

		// Force wall-clock time to jump past the ~50ms budget between files so the loop
		// takes its yield branch deterministically (validation itself is instantaneous here).
		let now = 1000;
		const dateSpy = vi.spyOn(Date, 'now').mockImplementation(() => (now += 100));

		try {
			await service.validateAllProfiles([
				vscode.Uri.parse('file:///w/a.ttl'),
				vscode.Uri.parse('file:///w/b.ttl'),
				vscode.Uri.parse('file:///w/c.ttl'),
			]);

			expect(yieldSpy).toHaveBeenCalled();
		} finally {
			dateSpy.mockRestore();
		}
	});
});

describe('ShaclValidationService.validateAllProfiles', () => {
	it('matches files covered by any profile', async () => {
		const { service } = createService({
			profiles: { 'a': { shapes: ['s:1'], includeFiles: ['models/*'] } },
		});

		const summary = await service.validateAllProfiles([
			vscode.Uri.parse('file:///w/models/x.ttl'),
			vscode.Uri.parse('file:///w/other/y.ttl'),
		]);

		expect(summary.matched).toBe(1);
		expect(summary.hasShapes).toBe(true);
	});

	it('reports no shapes when there are no profiles', async () => {
		const { service } = createService({});

		expect((await service.validateAllProfiles([vscode.Uri.parse('file:///w/a.ttl')])).hasShapes).toBe(false);
	});
});

describe('ShaclValidationService.getOnChangeShapeGraphs', () => {
	it('resolves only the shapes of matching profiles with validateOnChange enabled', () => {
		const { service } = createService({
			profiles: {
				'auto': { shapes: ['s:1'], includeFiles: ['models/*'], validateOnChange: true },
				'manual': { shapes: ['s:2'], includeFiles: ['models/*'] },
			},
		});

		expect(service.getOnChangeShapeGraphs(vscode.Uri.parse('file:///w/models/data.ttl')))
			.toEqual(['s:1']);
	});

	it('returns an empty list when no matching profile opts in', () => {
		const { service } = createService({
			profiles: {
				'manual': { shapes: ['s:1'], includeFiles: ['models/*'] },
			},
		});

		expect(service.getOnChangeShapeGraphs(vscode.Uri.parse('file:///w/models/data.ttl')))
			.toEqual([]);
	});
});

describe('ShaclValidationService.validateStartupProfiles', () => {
	it('returns undefined without running a batch when no profile opts in', async () => {
		const { service } = createService({
			profiles: { 'manual': { shapes: ['s:1'], includeFiles: ['**/*'] } },
		});

		expect(await service.validateStartupProfiles([vscode.Uri.parse('file:///w/a.ttl')])).toBeUndefined();
		expect(service.lastRunStatistics).toBeUndefined();
	});

	it('matches only files covered by profiles with validateOnStartup enabled', async () => {
		const { service } = createService({
			profiles: {
				'startup': { shapes: ['s:1'], includeFiles: ['models/*'], validateOnStartup: true },
				'manual': { shapes: ['s:2'], includeFiles: ['other/*'] },
			},
		});

		const summary = await service.validateStartupProfiles([
			vscode.Uri.parse('file:///w/models/x.ttl'),
			vscode.Uri.parse('file:///w/other/y.ttl'),
		]);

		expect(summary?.matched).toBe(1);
		expect(summary?.hasShapes).toBe(true);
	});
});

describe('ShaclValidationService.getDocumentValidationState', () => {
	it('reports the matched profiles and path entries', () => {
		const { service } = createService({
			profiles: {
				'core': { shapes: ['workspace:///shapes/core.ttl'], includeFiles: ['**/*.ttl'] },
			},
		});

		const state = service.getDocumentValidationState(vscode.Uri.parse('file:///w/models/data.ttl'));

		expect(state.mode).toBe('matched');
		expect(state.matchedPaths).toEqual(['**/*.ttl']);
		expect(state.profileNames).toEqual(['core']);
	});
});

describe('ShaclSettingsSyncService.migrateShaclSettings', () => {
	it('rewrites shape URIs and path entries on a folder rename', async () => {
		const { service, updates } = createService({
			profiles: {
				'core': {
					shapes: ['workspace:///models/shapes.ttl'],
					includeFiles: ['models/*.ttl', 'models/data.ttl', '**/*.ttl'],
				},
			},
		});

		await service.settingsSync.migrateShaclSettings([
			{ oldUri: vscode.Uri.parse('file:///w/models'), newUri: vscode.Uri.parse('file:///w/renamed') },
		]);

		expect(updates).toHaveLength(1);
		expect(updates[0].target).toBe(vscode.ConfigurationTarget.Workspace);

		const migrated = updates[0].value as ShaclValidationSettings;

		expect(migrated.profiles?.['core'].shapes).toEqual(['workspace:///renamed/shapes.ttl']);
		expect(migrated.profiles?.['core'].includeFiles).toEqual(['renamed/*.ttl', 'renamed/data.ttl', '**/*.ttl']);
	});

	it('ignores renames of files outside the workspace', async () => {
		const { service, updates } = createService({
			profiles: { 'core': { includeFiles: ['data.ttl'] } },
		});

		await service.settingsSync.migrateShaclSettings([
			{ oldUri: vscode.Uri.parse('file:///other/a.ttl'), newUri: vscode.Uri.parse('file:///other/b.ttl') },
		]);

		expect(updates).toHaveLength(0);
	});
});

/**
 * Constructs the service with a store stub whose per-graph versions can be
 * mutated between validation runs, and a document context registered for
 * `file:///w/data.ttl`.
 */
function createValidationService(graphVersions: Record<string, number> = {}) {
	(vscode.workspace as any).getConfiguration = vi.fn(() => ({
		get: (_key: string, defaultValue?: any) => defaultValue,
		inspect: () => ({}),
		update: async () => { },
	}));

	const context = { subscriptions: [] } as any;
	const store = {
		hasGraph: () => true,
		getGraphVersion: vi.fn((uri: string) => graphVersions[uri] ?? 0),
		getDataset: vi.fn(() => ({})),
	} as any;

	const documentUri = vscode.Uri.parse('file:///w/data.ttl');
	const documentContext = { graphs: [documentUri.toString()], subjects: {}, references: {} } as any;
	const contextService = {
		contexts: { [documentUri.toString()]: documentContext },
		onDidChangeDocumentContext: () => ({ dispose: () => { } }),
	} as any;
	const documentFactory = { supportedExtensions: {} } as any;

	const service = new ShaclValidationService(context, store, contextService, documentFactory);

	return { service, store, documentUri, graphVersions };
}

describe('ShaclValidationService.validateDocument', () => {
	const shapes = ['workspace:///shapes/core.ttl'];

	it('reuses the cached validator when the shape graph versions are unchanged', async () => {
		const { service, documentUri } = createValidationService({ [shapes[0]]: 1 });

		await service.validateDocument(documentUri, shapes);
		await service.validateDocument(documentUri, shapes);

		expect(ValidatorMock).toHaveBeenCalledTimes(1);
		expect((ValidatorMock.mock.instances[0] as any).validate).toHaveBeenCalledTimes(2);
	});

	it('rebuilds the validator when a shape graph version changes', async () => {
		const { service, documentUri, graphVersions } = createValidationService({ [shapes[0]]: 1 });

		await service.validateDocument(documentUri, shapes);

		graphVersions[shapes[0]] = 2;

		await service.validateDocument(documentUri, shapes);

		expect(ValidatorMock).toHaveBeenCalledTimes(2);
	});

	it('shares a single validation between concurrent triggers', async () => {
		const { service, documentUri } = createValidationService();

		const [first, second] = await Promise.all([
			service.validateDocument(documentUri, shapes),
			service.validateDocument(documentUri, shapes),
		]);

		expect(first).toBe(second);
		expect(ValidatorMock).toHaveBeenCalledTimes(1);
		expect((ValidatorMock.mock.instances[0] as any).validate).toHaveBeenCalledTimes(1);
	});

	it('fires onDidValidate immediately for a single-document run (not coalesced)', async () => {
		const { service, documentUri } = createValidationService();

		const fired: string[] = [];
		service.onDidValidate((uri: any) => fired.push(uri.toString()));

		await service.validateDocument(documentUri, shapes);

		expect(fired).toEqual([documentUri.toString()]);
	});

	it('shows the status bar item during a single-document run and hides it afterwards', async () => {
		let item: any;
		let shownDuringRun = false;
		let hidden = 0;
		const originalCreate = (vscode.window as any).createStatusBarItem;
		(vscode.window as any).createStatusBarItem = vi.fn(() => (item = {
			text: '', tooltip: '', command: undefined, show: () => { }, hide: () => { hidden++; }, dispose: () => { },
		}));

		let textDuringRun = '';
		ValidatorMock.mockImplementationOnce(function (this: any) {
			this.validate = vi.fn(async () => {
				textDuringRun = item.text;
				shownDuringRun = true;
				return { conforms: true, dataset: {}, results: [] };
			});
		});

		try {
			const { service, documentUri } = createValidationService();

			const result = await service.validateDocument(documentUri, shapes);

			expect(result).toBeDefined();
			expect(shownDuringRun).toBe(true);
			expect(textDuringRun).toContain('Validating');
			// The item is hidden once the single-document run finishes.
			expect(hidden).toBeGreaterThan(0);
		} finally {
			(vscode.window as any).createStatusBarItem = originalCreate;
		}
	});
});

describe('ShaclSettingsSyncService.handleFileDeletes', () => {
	it('prunes literal path entries when the document is deleted', async () => {
		const { service, updates } = createService({
			profiles: {
				'core': { shapes: ['workspace:///shapes/core.ttl'], includeFiles: ['data.ttl', 'other.ttl'] },
			},
		});

		await service.settingsSync.handleFileDeletes([vscode.Uri.parse('file:///w/data.ttl')]);

		expect(updates).toHaveLength(1);
		expect(updates[0].value.profiles['core'].includeFiles).toEqual(['other.ttl']);
		expect(updates[0].target).toBe(vscode.ConfigurationTarget.Workspace);
	});

	it('removes the includeFiles field when the last entry is pruned', async () => {
		const { service, updates } = createService({
			profiles: {
				'doc': { shapes: ['workspace:///shapes/core.ttl'], includeFiles: ['data.ttl'] },
			},
		});

		await service.settingsSync.handleFileDeletes([vscode.Uri.parse('file:///w/data.ttl')]);

		expect(updates).toHaveLength(1);
		expect(updates[0].value.profiles['doc'].includeFiles).toBeUndefined();
	});

	it('prunes fragment-qualified entries when the notebook is deleted', async () => {
		const { service, updates } = createService({
			profiles: {
				'cell': { shapes: ['workspace:///shapes/core.ttl'], includeFiles: ['nb.mnb#cell-1'] },
			},
		});

		await service.settingsSync.handleFileDeletes([vscode.Uri.parse('file:///w/nb.mnb')]);

		expect(updates).toHaveLength(1);
		expect(updates[0].value.profiles['cell'].includeFiles).toBeUndefined();
	});

	it('prunes folder-scoped patterns and exclusions but keeps root-anchored ones', async () => {
		const { service, updates } = createService({
			profiles: {
				'core': { includeFiles: ['ontologies/*.ttl', '**/*.ttl'], excludeFiles: ['ontologies/scratch.ttl'] },
			},
		});

		await service.settingsSync.handleFileDeletes([vscode.Uri.parse('file:///w/ontologies')]);

		expect(updates).toHaveLength(1);
		expect(updates[0].value.profiles['core'].includeFiles).toEqual(['**/*.ttl']);
		expect(updates[0].value.profiles['core'].excludeFiles).toBeUndefined();
	});

	it('warns without pruning when a deleted file is referenced as a shape', async () => {
		const { service, updates } = createService({
			profiles: {
				'core': { shapes: ['workspace:///shapes/core.ttl'], includeFiles: ['**/*'] },
			},
		});

		(vscode.window as any).showWarningMessage = vi.fn(async () => 'Manage Profiles');

		await service.settingsSync.handleFileDeletes([vscode.Uri.parse('file:///w/shapes/core.ttl')]);

		// The shape list is not modified — no settings write.
		expect(updates).toHaveLength(0);
		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
			expect.stringContaining('core'),
			'Manage Profiles'
		);
		expect(vscode.commands.executeCommand).toHaveBeenCalledWith('mentor.command.openSettings', 'validation.profiles');
	});

	it('ignores deletions of files outside the workspace', async () => {
		const { service, updates } = createService({
			profiles: { 'core': { includeFiles: ['data.ttl'] } },
		});

		await service.settingsSync.handleFileDeletes([vscode.Uri.parse('file:///other/thing.ttl')]);

		expect(updates).toHaveLength(0);
		expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
	});
});

describe('ShaclValidationService.scheduleShapeGraphReaction', () => {
	it('coalesces a burst of fires into a single revalidate + profile-check pass', async () => {
		vi.useFakeTimers();
		try {
			const { service } = createService({ profiles: {} });
			const revalidate = vi.spyOn(service, 'revalidateOpenDocuments').mockResolvedValue(undefined);
			const check = vi.spyOn(service, 'checkShaclProfiles').mockResolvedValue({ profiles: {} });

			// A startup storm: many shape graphs load in rapid succession.
			for (let i = 0; i < 10; i++) {
				service.scheduleShapeGraphReaction();
			}

			await vi.advanceTimersByTimeAsync(250);

			expect(revalidate).toHaveBeenCalledTimes(1);
			expect(check).toHaveBeenCalledTimes(1);
		} finally {
			vi.useRealTimers();
		}
	});

	it('runs exactly one follow-up pass when fires arrive mid-pass', async () => {
		vi.useFakeTimers();
		try {
			const { service } = createService({ profiles: {} });

			let resolveFirst!: () => void;
			const revalidate = vi.spyOn(service, 'revalidateOpenDocuments')
				.mockImplementationOnce(() => new Promise<void>(resolve => { resolveFirst = resolve; }))
				.mockResolvedValue(undefined);
			const check = vi.spyOn(service, 'checkShaclProfiles').mockResolvedValue({ profiles: {} });

			service.scheduleShapeGraphReaction();
			await vi.advanceTimersByTimeAsync(250);
			expect(revalidate).toHaveBeenCalledTimes(1);

			// Three more fires while the first pass is still running…
			service.scheduleShapeGraphReaction();
			service.scheduleShapeGraphReaction();
			service.scheduleShapeGraphReaction();
			await vi.advanceTimersByTimeAsync(250);

			// …must not start an overlapping pass.
			expect(revalidate).toHaveBeenCalledTimes(1);

			resolveFirst();
			await vi.advanceTimersByTimeAsync(250);

			// One trailing pass covers all three fires.
			expect(revalidate).toHaveBeenCalledTimes(2);
			expect(check).toHaveBeenCalledTimes(2);
		} finally {
			vi.useRealTimers();
		}
	});
});

describe('ShaclValidationService missing shape graph reporting', () => {
	const A = 'file:///w/a.ttl';

	function createServiceWithShapeGraphs(hasShapeSource: (uri: string) => boolean) {
		(vscode.workspace as any).getConfiguration = vi.fn(() => ({
			get: (_key: string, defaultValue?: any) => defaultValue,
			inspect: (key: string) => key === 'validation'
				? { globalValue: undefined, workspaceValue: { profiles: { all: { shapes: ['user:///shapes/empty.ttl'], includeFiles: ['**/*'] } } } }
				: {},
			update: async () => { },
		}));

		const store = {
			hasGraph: () => false,
			getGraphVersion: vi.fn(() => 0),
			getDataset: vi.fn(() => ({ size: 1 })),
		} as any;

		const contexts: Record<string, any> = {
			[A]: { graphs: [A], subjects: {}, references: {} },
		};

		const contextService = { contexts, onDidChangeDocumentContext: () => ({ dispose: () => { } }) } as any;
		const documentFactory = { supportedExtensions: { '.ttl': { language: 'turtle', isTripleSource: true } } } as any;
		const shapeGraphs = { ensureLoaded: vi.fn(async () => { }), hasShapeSource: vi.fn(hasShapeSource) } as any;

		const service = new ShaclValidationService({ subscriptions: [] } as any, store, contextService, documentFactory, undefined, shapeGraphs);

		return { service };
	}

	it('does not report an existing-but-empty shape source as missing', async () => {
		const { service } = createServiceWithShapeGraphs(uri => uri === 'user:///shapes/empty.ttl');

		await service.validateAllProfiles([vscode.Uri.parse(A)]);

		expect(service.getLastResult(vscode.Uri.parse(A))?.missingShapeGraphs).toBeUndefined();
	});

	it('still reports a shape graph without any source as missing', async () => {
		const { service } = createServiceWithShapeGraphs(() => false);

		await service.validateAllProfiles([vscode.Uri.parse(A)]);

		expect(service.getLastResult(vscode.Uri.parse(A))?.missingShapeGraphs).toEqual(['user:///shapes/empty.ttl']);
	});
});
