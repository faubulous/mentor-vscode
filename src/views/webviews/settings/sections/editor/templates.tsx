import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { useBulkScopeMenuItems } from '../../components/use-bulk-scope-menu-items';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export function TemplatesSection({ keys, settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(settings, setScope);
	const menuItems = useBulkScopeMenuItems([...keys], settings, onBulkScope);
	return (
		<div>
			<FormSectionHeader title={templatesDescriptor.label} menuItems={menuItems} large />
			{keys.map((key) => (
				<SettingRow key={key} {...rowProps(key)}>
					<vscode-textarea
						className='monospace'
						rows={12}
						value={String(settings[key]?.value ?? '')}
						onInput={(e: any) => onUpdate(key, (e.target as HTMLTextAreaElement).value)}
					/>
				</SettingRow>
			))}
		</div>
	);
}

export const templatesDescriptor = {
	id: 'editor.templates',
	group: 'editor',
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
