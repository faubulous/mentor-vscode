import { ComponentType } from 'react';
import { SettingsNavigationSection, SETTINGS } from './settings-metadata';

import { ConnectionsSection } from './sections/connections';
import { DefinitionsTreeSection } from './sections/definitions-tree';
import { DisplaySection } from './sections/display';
import { EditorGeneralSection } from './sections/editor-general';
import { FormattingSection } from './sections/formatting';
import { IndexingSection } from './sections/indexing';
import { QuerySection } from './sections/query';
import { QueryTemplatesSection } from './sections/query-templates';
import { SortingSection } from './sections/sorting';
import { TemplatesSection } from './sections/templates';
import { ValidationSection } from './sections/validation';

export interface SectionRegistryEntry {
    id: SettingsNavigationSection;
    component: ComponentType<any>;
    keys: string[];
}

export const SECTION_REGISTRY: Record<SettingsNavigationSection, SectionRegistryEntry> = {
    'appearance.display': { id: 'appearance.display', component: DisplaySection, keys: [] },
    'appearance.definitions-tree': { id: 'appearance.definitions-tree', component: DefinitionsTreeSection, keys: [] },
    'editor.general': { id: 'editor.general', component: EditorGeneralSection, keys: [] },
    'editor.formatting': { id: 'editor.formatting', component: FormattingSection, keys: [] },
    'editor.sorting': { id: 'editor.sorting', component: SortingSection, keys: [] },
    'editor.templates': { id: 'editor.templates', component: TemplatesSection, keys: [] },
    'editor.validation': { id: 'editor.validation', component: ValidationSection, keys: [] },
    'indexing': { id: 'indexing', component: IndexingSection, keys: [] },
    'connections': { id: 'connections', component: ConnectionsSection, keys: [] },
    'query.general': { id: 'query.general', component: QuerySection, keys: [] },
    'query.templates': { id: 'query.templates', component: QueryTemplatesSection, keys: [] },
};

// Populate the keys dynamically from SETTINGS metadata to avoid hand-maintaining arrays
for (const [key, meta] of Object.entries(SETTINGS)) {
    if (SECTION_REGISTRY[meta.section]) {
        SECTION_REGISTRY[meta.section].keys.push(key);
    }
}
