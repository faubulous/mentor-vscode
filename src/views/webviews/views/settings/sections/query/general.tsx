import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { MENTOR_SOURCE } from '../../settings-types';
import { useBulkScopeMenuItems } from '../../components/use-bulk-scope-menu-items';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const queryGeneralSection = {
	id: 'query.general',
	label: 'General',
	component: QuerySection,
	keys: [
		'sparql.defaultInferenceEnabled',
		'sparql.queryTimeout',
	],
	hiddenKeys: ['inference.enabled'],
} as const satisfies SettingsSectionDescriptor;

export function QuerySection({ settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SOURCE, settings, setScope);
	const allKeys = [...queryGeneralSection.keys, ...(queryGeneralSection.hiddenKeys ?? [])];
	const menuItems = useBulkScopeMenuItems(MENTOR_SOURCE, allKeys, settings, onBulkScope);

	return (
		<div>
			<FormSectionHeader title={queryGeneralSection.label} menuItems={menuItems} large />
			<div className="settings-subsection">
				<SettingRow {...rowProps('sparql.queryTimeout')}>
					<vscode-textfield
						className="setting-input-md"
						value={String(settings['sparql.queryTimeout']?.value ?? 30000)}
						type="number"
						onInput={(e: any) => onUpdate(MENTOR_SOURCE, 'sparql.queryTimeout', Number((e.target as HTMLInputElement).value))}
					>
						<span slot="content-after" className="setting-input-suffix">ms</span>
					</vscode-textfield>
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
						onChange={(e: any) => onUpdate(MENTOR_SOURCE, 'inference.enabled', (e.target as HTMLInputElement).checked)}
					>
						Enabled
					</vscode-checkbox>
				</SettingRow>
				<SettingRow {...rowProps('sparql.defaultInferenceEnabled')}>
					<vscode-checkbox
						checked={settings['sparql.defaultInferenceEnabled']?.value === true}
						onChange={(e: any) => onUpdate(MENTOR_SOURCE, 'sparql.defaultInferenceEnabled', (e.target as HTMLInputElement).checked)}
					>
						Enabled
					</vscode-checkbox>
				</SettingRow>
			</div>
		</div>
	);
}