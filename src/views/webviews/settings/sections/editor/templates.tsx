import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { MENTOR_SOURCE } from '../../settings-types';
import { useBulkScopeMenuItems } from '../../components/use-bulk-scope-menu-items';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const editorTemplatesSection = {
	id: 'editor.templates',
	label: 'Templates',
	component: TemplatesSection,
	keys: [
		'language.sparql.defaultDocumentTemplate',
		'language.sparql.documentQueryTemplate',
		'language.turtle.defaultDocumentTemplate',
		'language.trig.defaultDocumentTemplate',
		'language.n3.defaultDocumentTemplate',
		'language.ntriples.defaultDocumentTemplate',
		'language.nquads.defaultDocumentTemplate',
	],
} as const satisfies SettingsSectionDescriptor;

export function TemplatesSection({ keys, settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SOURCE, settings, setScope);
	const menuItems = useBulkScopeMenuItems(MENTOR_SOURCE, [...keys], settings, onBulkScope);
	return (
		<div>
			<FormSectionHeader title={editorTemplatesSection.label} menuItems={menuItems} large />
			{keys.map((key) => (
				<SettingRow key={key} {...rowProps(key)}>
					<vscode-textarea
						className='monospace'
						rows={12}
						value={String(settings[key]?.value ?? '')}
						onInput={(e: any) => onUpdate(MENTOR_SOURCE, key, (e.target as HTMLTextAreaElement).value)}
					/>
				</SettingRow>
			))}
		</div>
	);
}