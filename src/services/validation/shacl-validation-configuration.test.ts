import { describe, expect, it } from 'vitest';
import {
	buildGraphShapeConfigurationFromSelection,
	getGraphSelectionState,
	isImplicitGraphShapeConfiguration,
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
});
