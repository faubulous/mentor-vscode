import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { useBulkScopeMenuItems } from '../../components/use-bulk-scope-menu-items';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export function QuerySection({ settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(settings, setScope);
	const allKeys = [...queryGeneralDescriptor.keys, ...(queryGeneralDescriptor.hiddenKeys ?? [])];
	const menuItems = useBulkScopeMenuItems(allKeys, settings, onBulkScope);

	return (
		<div>
			<FormSectionHeader title={queryGeneralDescriptor.label} menuItems={menuItems} large />
			<div className="settings-subsection">
				<SettingRow {...rowProps('sparql.queryTimeout')}>
					<vscode-textfield
						value={String(settings['sparql.queryTimeout']?.value ?? 30000)}
						type="number"
						onInput={(e: any) => onUpdate('sparql.queryTimeout', Number((e.target as HTMLInputElement).value))}
					/>
				</SettingRow>
			</div>
			<div className="settings-subsection">
				<div className="settings-group-title">
					Inference <span className="badge-experimental">Experimental</span>
				</div>
				<SettingRow
					{...rowProps('inference.enabled')}
					label="Enable inference toggle"
					description="Show the inference toggle button in the SPARQL connection view."
				>
					<vscode-checkbox
						checked={settings['inference.enabled']?.value === true}
						onChange={(e: any) => onUpdate('inference.enabled', (e.target as HTMLInputElement).checked)}
					>
						Enabled
					</vscode-checkbox>
				</SettingRow>
				<SettingRow {...rowProps('sparql.defaultInferenceEnabled')}>
					<vscode-checkbox
						checked={settings['sparql.defaultInferenceEnabled']?.value === true}
						onChange={(e: any) => onUpdate('sparql.defaultInferenceEnabled', (e.target as HTMLInputElement).checked)}
					>
						Enabled
					</vscode-checkbox>
				</SettingRow>
			</div>
		</div>
	);
}

export const queryGeneralDescriptor = {
	id: 'query.general',
	group: 'query',
	label: 'General',
	component: QuerySection,
	keys: [
		'sparql.defaultInferenceEnabled',
		'sparql.queryTimeout',
	],
	hiddenKeys: ['inference.enabled'],
} as const satisfies SettingsSectionDescriptor;
