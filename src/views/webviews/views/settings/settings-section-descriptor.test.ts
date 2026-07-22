import { describe, it, expect } from 'vitest';
import { validateSectionDescriptors } from './settings-section-descriptor';
import { SETTINGS_GROUPS, defaultScopeForKey } from './sections/index';
import { MENTOR_SETTINGS_SOURCE as MENTOR_SOURCE, SettingsSource } from './settings-types';
import * as packageJson from '../../../../../package.json';

describe('section descriptors', () => {
	it('claim every mentor.* key in package.json exactly once', () => {
		const properties = (packageJson as unknown as {
			contributes: { configuration: Array<{ properties: Record<string, unknown> }> };
		}).contributes.configuration[0].properties;

		const sections = SETTINGS_GROUPS.flatMap(g => [...g.sections]);
		const errors = validateSectionDescriptors(sections, properties);

		expect(errors).toEqual([]);
	});
});

describe('defaultScopeForKey', () => {
	const turtleEditor: SettingsSource = { kind: 'languageEditor', languageId: 'turtle' };

	it.each([
		'predicates.label',
		'formatting.common.maxLineWidth',
		'formatting.sparql.uppercaseKeywords',
		'formatting.turtle.maxLineWidth', // hidden key in the Formatting section
		'sorting.typeSortingOptions',
		'shacl.enabled',
		'linting.unresolvedReferenceSeverity',
		'index.excludeFiles',
	])('defaults %s to workspace', (key) => {
		expect(defaultScopeForKey(MENTOR_SOURCE, key)).toBe('workspace');
	});

	it.each([
		'definitionTree.labelStyle',
		'editor.codeLensEnabled',
		'prefixes.prefixDefinitionMode',
		'namespaces',
		'language.turtle.defaultDocumentTemplate',
	])('keeps %s on user', (key) => {
		expect(defaultScopeForKey(MENTOR_SOURCE, key)).toBe('user');
	});

	it('defaults the surfaced editor builtin keys in the Formatting section to workspace', () => {
		expect(defaultScopeForKey(turtleEditor, 'formatOnSave')).toBe('workspace');
		expect(defaultScopeForKey(turtleEditor, 'tabSize')).toBe('workspace');
	});

	it('falls back to user for an unknown key', () => {
		expect(defaultScopeForKey(MENTOR_SOURCE, 'does.not.exist')).toBe('user');
	});
});
