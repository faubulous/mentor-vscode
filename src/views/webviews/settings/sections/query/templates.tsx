import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../../components/setting-row';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import { useBulkScopeMenuItems } from '../../components/use-bulk-scope-menu-items';
import { SettingsSectionProps } from '../../settings-section-props';
import { MENTOR_SOURCE } from '../../settings-types';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const queryTemplatesSection = {
	id: 'query.templates',
	label: 'Templates',
	component: QueryTemplatesSection,
	keys: [
		'sparql.listGraphsQuery',
		'sparql.dropGraphQuery',
		'sparql.describeQueryTemplate',
	],
} as const satisfies SettingsSectionDescriptor;

export function QueryTemplatesSection({ keys, settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SOURCE, settings, setScope);
	const menuItems = useBulkScopeMenuItems(MENTOR_SOURCE, [...keys], settings, onBulkScope);
	return (
		<div>
			<FormSectionHeader title={queryTemplatesSection.label} menuItems={menuItems} large />
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