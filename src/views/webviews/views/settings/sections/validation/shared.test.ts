import { describe, expect, it } from 'vitest';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { VALIDATION_PRESETS } from '@src/services/validation/preset-definitions';
import { applyProfileSave, presetToDraft, toProfileValue, ValidationProfileView } from './shared';

function view(overrides: Partial<ValidationProfileView> = {}): ValidationProfileView {
	return {
		id: '',
		name: 'Core',
		shapes: ['workspace:///shapes/core.ttl'],
		includeFiles: ['models/*'],
		excludeFiles: [],
		description: '',
		scope: ConfigurationScope.Workspace,
		...overrides,
	};
}

describe('toProfileValue', () => {
	it('omits empty fields', () => {
		expect(toProfileValue(view({ name: '  ', shapes: [], includeFiles: [], excludeFiles: [], description: ' ' }))).toEqual({});
		expect(toProfileValue(view({ description: 'Checks the core model.', excludeFiles: ['drafts/**'] }))).toEqual({
			name: 'Core',
			shapes: ['workspace:///shapes/core.ttl'],
			includeFiles: ['models/*'],
			excludeFiles: ['drafts/**'],
			description: 'Checks the core model.',
		});
	});

	});
});

describe('presetToDraft', () => {
	it('seeds a create draft that references the written workspace copies', () => {
		const preset = VALIDATION_PRESETS[0];
		const shapes = ['workspace:///.mentor/shapes/basic-ontology.shape.ttl'];
		const draft = presetToDraft(preset, ConfigurationScope.Workspace, shapes);

		expect(draft.id).toBe('');
		expect(draft.name).toBe('');
		expect(draft.shapes).toEqual(shapes);
		expect(draft.description).toBe(preset.description);
		expect(draft.includeFiles).toEqual(['**/*']);
		expect(draft.excludeFiles).toEqual([]);
		expect(draft.scope).toBe(ConfigurationScope.Workspace);
	});

	it('copies the supplied shapes so edits do not mutate the caller array', () => {
		const preset = VALIDATION_PRESETS[0];
		const shapes = ['workspace:///.mentor/shapes/basic-ontology.shape.ttl'];
		const draft = presetToDraft(preset, ConfigurationScope.User, shapes);

		draft.shapes.push('extra');

		expect(shapes).not.toContain('extra');
	});
});

describe('applyProfileSave', () => {
	it('mints a disambiguated id for new profiles', () => {
		const result = applyProfileSave({
			mode: 'create',
			originalId: '',
			originalScope: ConfigurationScope.Workspace,
			next: view({ name: 'Core', scope: ConfigurationScope.Workspace }),
			userProfiles: {},
			workspaceProfiles: { 'core': { name: 'Core' } },
		});

		expect(result).toEqual({
			user: {},
			workspace: {
				'core': { name: 'Core' },
				'core-2': {
					name: 'Core',
					shapes: ['workspace:///shapes/core.ttl'],
					includeFiles: ['models/*'],
				},
			},
		});
	});

	it('instantiates a preset into a fresh profile referencing the written workspace shapes', () => {
		const preset = VALIDATION_PRESETS[1];
		const shapes = ['workspace:///.mentor/shapes/basic-taxonomy.shape.ttl'];
		const draft = { ...presetToDraft(preset, ConfigurationScope.Workspace, shapes), name: 'My Taxonomy' };

		const result = applyProfileSave({
			mode: 'create',
			originalId: '',
			originalScope: ConfigurationScope.Workspace,
			next: draft,
			userProfiles: {},
			workspaceProfiles: {},
		});

		expect(result.workspace['my-taxonomy']).toEqual({
			name: 'My Taxonomy',
			shapes,
			includeFiles: ['**/*'],
			description: preset.description,
		});
	});

	it('keeps the id on edit and removes the profile from its original scope on a move', () => {
		const stored = { name: 'Core', shapes: ['workspace:///shapes/core.ttl'] };

		const result = applyProfileSave({
			mode: 'edit',
			originalId: 'core',
			originalScope: ConfigurationScope.User,
			next: view({ id: 'core', scope: ConfigurationScope.Workspace }),
			userProfiles: { 'core': stored },
			workspaceProfiles: {},
		});

		expect(result.user).toEqual({});
		expect(Object.keys(result.workspace)).toEqual(['core']);
	});

	it('does not mutate the given profile records', () => {
		const userProfiles = { 'core': { name: 'Core' } };

		applyProfileSave({
			mode: 'edit',
			originalId: 'core',
			originalScope: ConfigurationScope.User,
			next: view({ id: 'core', scope: ConfigurationScope.Workspace }),
			userProfiles,
			workspaceProfiles: {},
		});

		expect(userProfiles).toEqual({ 'core': { name: 'Core' } });
	});
});
