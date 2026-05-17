import { SettingScope, SettingState } from '../settings-types';
import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../components/setting-row';
import { useSettingRowProps } from '../components/use-setting-row-props';
import { useBulkScopeMenuItems } from '../components/use-bulk-scope-menu-items';
import { SECTION_TITLES } from '../settings-metadata';

export interface QuerySectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	setScope: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function QuerySection({ settings, onUpdate, setScope, onBulkScope }: QuerySectionProps) {
	const keys = [
		'sparql.defaultInferenceEnabled',
		'sparql.queryTimeout',
		'sparql.listGraphsQuery',
		'sparql.dropGraphQuery',
		'sparql.describeQueryTemplate',
		'inference.enabled',
	];

	const rowProps = useSettingRowProps(settings, setScope);
	const menuItems = useBulkScopeMenuItems(keys, settings, onBulkScope);

	return (
		<div>
			<FormSectionHeader title={SECTION_TITLES['query.general']} menuItems={menuItems} large />
			<div className="settings-subsection">
				<SettingRow {...rowProps('sparql.queryTimeout')}>
					<vscode-textfield
						value={String(settings['sparql.queryTimeout']?.value ?? 30000)}
						type="number"
						onInput={(e: any) => onUpdate('sparql.queryTimeout', Number((e.target as HTMLInputElement).value))}
					/>
				</SettingRow>
				<SettingRow {...rowProps('sparql.listGraphsQuery')}>
					<vscode-textarea
						className='monospace'
						rows={12}
						value={String(settings['sparql.listGraphsQuery']?.value ?? '')}
						onInput={(e: any) => onUpdate('sparql.listGraphsQuery', (e.target as HTMLTextAreaElement).value)}
					/>
				</SettingRow>
				<SettingRow {...rowProps('sparql.dropGraphQuery')}>
					<vscode-textarea
						className='monospace'
						rows={12}
						value={String(settings['sparql.dropGraphQuery']?.value ?? '')}
						onInput={(e: any) => onUpdate('sparql.dropGraphQuery', (e.target as HTMLTextAreaElement).value)}
					/>
				</SettingRow>
				<SettingRow {...rowProps('sparql.describeQueryTemplate')}>
					<vscode-textarea
						className='monospace'
						rows={12}
						value={String(settings['sparql.describeQueryTemplate']?.value ?? '')}
						onInput={(e: any) => onUpdate('sparql.describeQueryTemplate', (e.target as HTMLTextAreaElement).value)}
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
