import { SettingsNavigationGroupConfig, SettingsSource } from '../settings-types';
import { ScopeKey } from '@src/utilities/config-scope';
import type { SettingsSectionDescriptor } from '../settings-section-descriptor';

import { appearanceDisplaySection } from './appearance/display';
import { appearanceDefinitionsTreeSection } from './appearance/definitions-tree';
import { editorGeneralSection } from './editor/general';
import { editorTemplatesSection } from './editor/templates';
import { editorFormattingSection } from './editor/formatting';
import { editorSortingSection } from './editor/sorting';
import { validationGeneralSection } from './validation/general';
import { validationProfilesSection } from './validation/profiles';
import { queryStoresSection } from './query/stores';
import { queryConnectionsSection } from './query/connections';
import { workspaceIndexingSection } from './workspace/indexing';

/**
 * Single source of truth for the settings panel: each entry is a navigation
 * group containing its sections in display order. Consumers derive whatever
 * shape they need (flat list, id→descriptor map, search index, …) locally.
 *
 * Adding a new section: import its descriptor and append it to the appropriate
 * group's `sections` array.
 */
export const SETTINGS_GROUPS = [
	{
		id: 'appearance',
		label: 'Appearance',
		sections: [
			appearanceDisplaySection,
			appearanceDefinitionsTreeSection,
		],
	},
	{
		id: 'editor',
		label: 'Editor',
		sections: [
			editorGeneralSection,
			editorTemplatesSection,
			editorFormattingSection,
			editorSortingSection,
		],
	},
	{
		id: 'query',
		label: 'Query',
		sections: [
			queryConnectionsSection,
			queryStoresSection,
		],
	},
	{
		id: 'validation',
		label: 'Validation',
		sections: [
			validationGeneralSection,
			validationProfilesSection,
		],
	},
	{
		id: 'workspace',
		label: 'Workspace',
		sections: [
			workspaceIndexingSection,
		],
	},
] as const satisfies readonly SettingsNavigationGroupConfig[];

/**
 * Literal union of every section id, derived from `SETTINGS_GROUPS`.
 */
export type SettingsSectionId = (typeof SETTINGS_GROUPS)[number]['sections'][number]['id'];

/**
 * Flat list of every section descriptor, in display order.
 */
const ALL_SECTIONS: readonly SettingsSectionDescriptor[] = SETTINGS_GROUPS.flatMap(g => [...g.sections]);

/**
 * The scope a key defaults to when it is still unset and the user edits it, per the
 * owning section's configuration: `keyScopeOverrides[key]`, then `defaultScope`,
 * falling back to `'user'` when the key has no owning section or none is declared.
 *
 * @param source The bucket the key lives in — `mentor` keys are matched against a
 *   section's `keys`/`hiddenKeys`, `languageEditor` keys against its `vscodeKeys`.
 * @param key The bare setting key (without the `mentor.`/`editor.` prefix).
 */
export function defaultScopeForKey(source: SettingsSource, key: string): ScopeKey {
	const ownsKey = (section: SettingsSectionDescriptor): boolean => {
		if (source.kind === 'mentor') {
			return section.keys.includes(key) || (section.hiddenKeys?.includes(key) ?? false);
		}

		return section.vscodeKeys?.some(k => k.key === key) ?? false;
	};

	const owner = ALL_SECTIONS.find(ownsKey);

	return owner?.keyScopeOverrides?.[key] ?? owner?.defaultScope ?? 'user';
}
