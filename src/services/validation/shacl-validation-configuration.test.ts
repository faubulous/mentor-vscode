import { describe, expect, it } from 'vitest';
import {
	buildGraphShapeConfigurationFromSelection,
	getGraphSelectionState,
	isImplicitGraphShapeConfiguration,
	migrateShaclValidationConfig,
	resolveEffectiveShapeGraphs,
	resolveEffectiveShapesFromGraphConfiguration,
	toUniqueStringArray,
	ShaclValidationConfiguration,
} from './shacl-validation-configuration';

describe('shacl-validation-configuration', () => {
	describe('toUniqueStringArray', () => {
		it('keeps first occurrence order and removes non-string/empty values', () => {
			expect(toUniqueStringArray(['a', 'b', 'a', '', '  ', 2, 'c', 'b'] as any)).toEqual(['a', 'b', 'c']);
		});
	});

	describe('resolveEffectiveShapesFromGraphConfiguration', () => {
		it('includes defaults and explicit includes while excluding explicit excludes', () => {
			const resolved = resolveEffectiveShapesFromGraphConfiguration(
				['shape:default-1', 'shape:default-2'],
				{
					includeDefaults: true,
					includeShapes: ['shape:extra-1', 'shape:default-2'],
					excludeShapes: ['shape:default-2']
				}
			);

			expect(resolved).toEqual(['shape:default-1', 'shape:extra-1']);
		});

		it('uses only explicit includeShapes when includeDefaults is false', () => {
			const resolved = resolveEffectiveShapesFromGraphConfiguration(
				['shape:default-1'],
				{
					includeDefaults: false,
					includeShapes: ['shape:extra-1', 'shape:extra-2'],
					excludeShapes: []
				}
			);

			expect(resolved).toEqual(['shape:extra-1', 'shape:extra-2']);
		});
	});

	describe('resolveEffectiveShapeGraphs', () => {
		it('returns defaults for graphs without explicit config', () => {
			const config: ShaclValidationConfiguration = {
				defaults: ['shape:default-1', 'shape:default-2'],
				graphs: {}
			};

			expect(resolveEffectiveShapeGraphs(config, 'workspace:///graph-a.ttl')).toEqual(['shape:default-1', 'shape:default-2']);
		});

		it('returns empty list when no defaults and no graph config exist', () => {
			const config: ShaclValidationConfiguration = {
				graphs: {}
			};

			expect(resolveEffectiveShapeGraphs(config, 'workspace:///graph-a.ttl')).toEqual([]);
		});

		it('applies explicit graph include/exclude config when present', () => {
			const config: ShaclValidationConfiguration = {
				defaults: ['shape:default-1'],
				graphs: {
					'workspace:///graph-a.ttl': {
						includeDefaults: true,
						includeShapes: ['shape:extra'],
						excludeShapes: []
					}
				}
			};

			expect(resolveEffectiveShapeGraphs(config, 'workspace:///graph-a.ttl')).toEqual(['shape:default-1', 'shape:extra']);
		});
	});

	describe('buildGraphShapeConfigurationFromSelection', () => {
		it('creates include/exclude lists relative to defaults when includeDefaults is true', () => {
			const config = buildGraphShapeConfigurationFromSelection(
				['shape:default-1', 'shape:extra-1'],
				['shape:default-1', 'shape:default-2'],
				true
			);

			expect(config).toEqual({
				includeDefaults: true,
				includeShapes: ['shape:extra-1'],
				excludeShapes: ['shape:default-2']
			});
		});

		it('stores full selection as includeShapes when includeDefaults is false', () => {
			const config = buildGraphShapeConfigurationFromSelection(
				['shape:a', 'shape:b'],
				['shape:default'],
				false
			);

			expect(config).toEqual({
				includeDefaults: false,
				includeShapes: ['shape:a', 'shape:b'],
				excludeShapes: []
			});
		});
	});

	describe('getGraphSelectionState', () => {
		it('returns graph state for explicit graph configuration', () => {
			const state = getGraphSelectionState(
				{
					defaults: ['shape:default-1'],
					graphs: {
						'workspace:///graph-a.ttl': {
							includeDefaults: false,
							includeShapes: ['shape:extra'],
							excludeShapes: []
						}
					}
				},
				'workspace:///graph-a.ttl'
			);

			expect(state.source).toBe('graph');
			expect(state.includeDefaults).toBe(false);
			expect(state.effectiveShapes).toEqual(['shape:extra']);
		});

		it('returns implicit state when graph has no explicit entry', () => {
			const state = getGraphSelectionState(
				{ defaults: ['shape:default-1'] },
				'workspace:///graph-a.ttl'
			);

			expect(state.source).toBe('implicit');
			expect(state.includeDefaults).toBe(true);
			expect(state.effectiveShapes).toEqual(['shape:default-1']);
		});
	});

	describe('isImplicitGraphShapeConfiguration', () => {
		it('returns true only when graph behavior matches inherited defaults', () => {
			expect(isImplicitGraphShapeConfiguration({
				includeDefaults: true,
				includeShapes: [],
				excludeShapes: [],
			})).toBe(true);

			expect(isImplicitGraphShapeConfiguration({
				includeDefaults: false,
				includeShapes: [],
				excludeShapes: [],
			})).toBe(false);
		});
	});

	describe('migrateShaclValidationConfig', () => {
		it('returns an empty object for undefined config', () => {
			expect(migrateShaclValidationConfig(undefined, [{ oldKey: 'workspace:///a.ttl', newKey: 'workspace:///b.ttl' }])).toEqual({});
		});

		it('returns config unchanged when no renames match', () => {
			const config: ShaclValidationConfiguration = {
				defaults: ['workspace:///shapes.ttl'],
				graphs: {
					'workspace:///data.ttl': { includeDefaults: true, includeShapes: [], excludeShapes: [] },
				},
			};

			const result = migrateShaclValidationConfig(config, [{ oldKey: 'workspace:///other.ttl', newKey: 'workspace:///new.ttl' }]);

			expect(result.defaults).toEqual(['workspace:///shapes.ttl']);
			expect(result.graphs).toHaveProperty('workspace:///data.ttl');
			expect(result.graphs).not.toHaveProperty('workspace:///new.ttl');
		});

		it('migrates a graphs key on file rename', () => {
			const config: ShaclValidationConfiguration = {
				graphs: {
					'workspace:///models/data.ttl': { includeDefaults: false, includeShapes: ['workspace:///shapes.ttl'], excludeShapes: [] },
				},
			};

			const result = migrateShaclValidationConfig(config, [
				{ oldKey: 'workspace:///models/data.ttl', newKey: 'workspace:///models/renamed.ttl' },
			]);

			expect(result.graphs).toHaveProperty('workspace:///models/renamed.ttl');
			expect(result.graphs).not.toHaveProperty('workspace:///models/data.ttl');
		});

		it('migrates a defaults entry on file rename', () => {
			const config: ShaclValidationConfiguration = {
				defaults: ['workspace:///shapes/old.ttl', 'workspace:///shapes/other.ttl'],
			};

			const result = migrateShaclValidationConfig(config, [
				{ oldKey: 'workspace:///shapes/old.ttl', newKey: 'workspace:///shapes/new.ttl' },
			]);

			expect(result.defaults).toContain('workspace:///shapes/new.ttl');
			expect(result.defaults).toContain('workspace:///shapes/other.ttl');
			expect(result.defaults).not.toContain('workspace:///shapes/old.ttl');
		});

		it('migrates all graphs keys and defaults entries under a renamed folder', () => {
			const config: ShaclValidationConfiguration = {
				defaults: ['workspace:///shapes/a.ttl'],
				graphs: {
					'workspace:///models/x.ttl': { includeDefaults: true, includeShapes: [], excludeShapes: [] },
					'workspace:///models/sub/y.ttl': { includeDefaults: false, includeShapes: [], excludeShapes: [] },
					'workspace:///other/z.ttl': { includeDefaults: true, includeShapes: [], excludeShapes: [] },
				},
			};

			const result = migrateShaclValidationConfig(config, [
				{ oldKey: 'workspace:///models', newKey: 'workspace:///renamed' },
			]);

			expect(result.graphs).toHaveProperty('workspace:///renamed/x.ttl');
			expect(result.graphs).toHaveProperty('workspace:///renamed/sub/y.ttl');
			expect(result.graphs).toHaveProperty('workspace:///other/z.ttl');
			expect(result.graphs).not.toHaveProperty('workspace:///models/x.ttl');
			expect(result.graphs).not.toHaveProperty('workspace:///models/sub/y.ttl');
		});

		it('does not migrate a sibling folder with a common name prefix', () => {
			const config: ShaclValidationConfiguration = {
				graphs: {
					'workspace:///models/a.ttl': { includeDefaults: true, includeShapes: [], excludeShapes: [] },
					'workspace:///models-extra/b.ttl': { includeDefaults: true, includeShapes: [], excludeShapes: [] },
				},
			};

			const result = migrateShaclValidationConfig(config, [
				{ oldKey: 'workspace:///models', newKey: 'workspace:///renamed' },
			]);

			expect(result.graphs).toHaveProperty('workspace:///renamed/a.ttl');
			expect(result.graphs).toHaveProperty('workspace:///models-extra/b.ttl');
			expect(result.graphs).not.toHaveProperty('workspace:///models/a.ttl');
		});

		it('preserves graph configuration values when migrating keys', () => {
			const graphConfig = { includeDefaults: false, includeShapes: ['workspace:///extra.ttl'], excludeShapes: ['workspace:///skip.ttl'] };
			const config: ShaclValidationConfiguration = {
				graphs: { 'workspace:///old.ttl': graphConfig },
			};

			const result = migrateShaclValidationConfig(config, [
				{ oldKey: 'workspace:///old.ttl', newKey: 'workspace:///new.ttl' },
			]);

			expect(result.graphs?.['workspace:///new.ttl']).toEqual(graphConfig);
		});
	});
});
