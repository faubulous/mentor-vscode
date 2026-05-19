import type { SettingsSectionDescriptor } from '../settings-section-descriptor';
import type { SettingsNavigationGroupConfig, SettingsNavigationSectionConfig } from '../settings-types';

import { displayDescriptor } from './appearance/display';
import { definitionsTreeDescriptor } from './appearance/definitions-tree';
import { editorGeneralDescriptor } from './editor/general';
import { templatesDescriptor } from './editor/templates';
import { editorFormattingDescriptor } from './editor/formatting';
import { editorSortingDescriptor } from './editor/sorting';
import { validationDescriptor } from './editor/validation';
import { queryGeneralDescriptor } from './query/general';
import { queryTemplatesDescriptor } from './query/templates';
import { queryConnectionsDescriptor } from './query/connections';
import { workspaceIndexingDescriptor } from './workspace/indexing';

/**
 * Ordered list of top-level navigation groups in the settings panel.
 * Each group can host zero or more sections; sections are attached by setting
 * their descriptor's `group` field to one of these ids.
 */
export const GROUPS = [
	{ id: 'appearance', label: 'Appearance' },
	{ id: 'editor', label: 'Editor' },
	{ id: 'query', label: 'Query' },
	{ id: 'workspace', label: 'Workspace' },
] as const satisfies readonly SettingsNavigationSectionConfig[];

/**
 * Ordered tuple of every settings section. The tuple type preserves each
 * descriptor's literal `id`, from which the `SettingsSectionId` union below is derived.
 *
 * Adding a new section: import its descriptor and append it here. Everything else
 * (navigation tree, registry, key list, search index) is derived automatically.
 */
export const SETTINGS_SECTIONS = [
	displayDescriptor,
	definitionsTreeDescriptor,
	editorGeneralDescriptor,
	templatesDescriptor,
	editorFormattingDescriptor,
	editorSortingDescriptor,
	validationDescriptor,
	queryGeneralDescriptor,
	queryTemplatesDescriptor,
	queryConnectionsDescriptor,
	workspaceIndexingDescriptor,
] as const satisfies readonly SettingsSectionDescriptor[];

/** Literal union of every section id, derived from `SETTINGS_SECTIONS`. */
export type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]['id'];

// Widened view for iteration — exposes optional fields (order, hiddenKeys, vscodeKeys)
// that the literal-typed `SETTINGS_SECTIONS` hides on descriptors that don't declare them.
const sections: readonly SettingsSectionDescriptor[] = SETTINGS_SECTIONS;

export const SETTINGS_SECTIONS_BY_ID = sections.reduce((acc, s) => {
	acc[s.id as SettingsSectionId] = s;
	return acc;
}, {} as Record<SettingsSectionId, SettingsSectionDescriptor>);

export const SETTINGS_SECTION_TITLES = sections.reduce((acc, s) => {
	acc[s.id as SettingsSectionId] = s.label;
	return acc;
}, {} as Record<SettingsSectionId, string>);

/**
 * Navigation groups with their sections, used to render the sidebar and drive deep-linking.
 */
export const SETTINGS_NAVIGATION_GROUPS: SettingsNavigationGroupConfig[] = GROUPS.map(g => ({
	id: g.id,
	label: g.label,
	sections: sections
		.filter(s => s.group === g.id)
		.slice()
		.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
		.map(s => ({ id: s.id, label: s.label })),
}));

/**
 * Entries that populate the search index. Hidden keys are excluded.
 */
export const SETTINGS_SEARCH_ENTRIES: { section: SettingsSectionId; key: string }[] =
	sections.flatMap(s => s.keys.map(key => ({ section: s.id as SettingsSectionId, key })));

/**
 * VS Code built-in keys surfaced by any section, used by the host to read editor settings.
 */
export const VSCODE_SETTING_KEYS: string[] =
	sections.flatMap(s => s.vscodeKeys?.map(k => k.key) ?? []);

/**
 * Every `mentor.*` key (without the prefix) claimed by some section, hidden or rendered.
 */
export const MENTOR_SETTINGS_KEYS: string[] =
	sections.flatMap(s => [...s.keys, ...(s.hiddenKeys ?? [])]);
