import { SettingsNavigationGroupConfig } from '../settings-types';

import { appearanceDisplaySection } from './appearance/display';
import { appearanceDefinitionsTreeSection } from './appearance/definitions-tree';
import { editorGeneralSection } from './editor/general';
import { editorTemplatesSection } from './editor/templates';
import { editorFormattingSection } from './editor/formatting';
import { editorSortingSection } from './editor/sorting';
import { editorValidationSection } from './editor/validation';
import { queryGeneralSection } from './query/general';
import { queryTemplatesSection } from './query/templates';
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
			editorValidationSection,
		],
	},
	{
		id: 'query',
		label: 'Query',
		sections: [
			queryGeneralSection,
			queryTemplatesSection,
			queryConnectionsSection,
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
