import { ComponentType } from 'react';
import { NavSection, SETTINGS } from './settings-metadata';

import { ConnectionsSection } from './sections/connections';
import { DefinitionsTreeSection } from './sections/definitions-tree';
import { DisplaySection } from './sections/display';
import { EditorGeneralSection } from './sections/editor-general';
import { FormattingSection } from './sections/formatting';
import { IndexingSection } from './sections/indexing';
import { QuerySection } from './sections/query';
import { SortingSection } from './sections/sorting';
import { TemplatesSection } from './sections/templates';
import { ValidationSection } from './sections/validation';

export interface SectionRegistryEntry {
    id: NavSection;
    component: ComponentType<any>;
    keys: string[];
}

export const SECTION_REGISTRY: Record<NavSection, SectionRegistryEntry> = {
    'appearance.display': { id: 'appearance.display', component: DisplaySection, keys: [] },
    'appearance.definitions-tree': { id: 'appearance.definitions-tree', component: DefinitionsTreeSection, keys: [] },
    'editor.general': { id: 'editor.general', component: EditorGeneralSection, keys: [] },
    'editor.formatting': { id: 'editor.formatting', component: FormattingSection, keys: [] },
    'editor.sorting': { id: 'editor.sorting', component: SortingSection, keys: [] },
    'editor.templates': { id: 'editor.templates', component: TemplatesSection, keys: [] },
    'indexing': { id: 'indexing', component: IndexingSection, keys: [] },
    'connections': { id: 'connections', component: ConnectionsSection, keys: [] },
    'query': { id: 'query', component: QuerySection, keys: [] },
    'validation': { id: 'validation', component: ValidationSection, keys: [] },
};

// Populate the keys dynamically from SETTINGS metadata to avoid hand-maintaining arrays
for (const [key, meta] of Object.entries(SETTINGS)) {
    if (SECTION_REGISTRY[meta.section]) {
        SECTION_REGISTRY[meta.section].keys.push(key);
    }
}
