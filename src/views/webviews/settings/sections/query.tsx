import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader } from '../components/section-header';
import { SettingRow } from '../components/setting-row';
import { SECTION_TITLES } from '../settings-metadata';

export interface QuerySectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function QuerySection({ settings, onUpdate, onScopeChange, onBulkScope }: QuerySectionProps) {
	const keys = [
		'sparql.defaultInferenceEnabled',
		'sparql.queryTimeout',
		'sparql.listGraphsQuery',
		'sparql.dropGraphQuery',
		'sparql.describeQueryTemplate',
		'inference.enabled',
	];

	return (
		<div>
			<SectionHeader title={SECTION_TITLES['query']} keys={keys} settings={settings} onBulkScope={onBulkScope} />
			<SettingRow
				label={settings['sparql.queryTimeout']?.title ?? ''}
				description={settings['sparql.queryTimeout']?.description ?? ''}
				settingKey="sparql.queryTimeout"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textfield
					value={String(settings['sparql.queryTimeout']?.value ?? 30000)}
					type="number"
					onInput={(e: any) => onUpdate('sparql.queryTimeout', Number((e.target as HTMLInputElement).value))}
				/>
			</SettingRow>
			<SettingRow
				label={settings['sparql.listGraphsQuery']?.title ?? ''}
				description={settings['sparql.listGraphsQuery']?.description ?? ''}
				settingKey="sparql.listGraphsQuery"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textarea
					className='monospace'
					rows={12}
					value={String(settings['sparql.listGraphsQuery']?.value ?? '')}
					onInput={(e: any) => onUpdate('sparql.listGraphsQuery', (e.target as HTMLTextAreaElement).value)}
				/>
			</SettingRow>
			<SettingRow
				label={settings['sparql.dropGraphQuery']?.title ?? ''}
				description={settings['sparql.dropGraphQuery']?.description ?? ''}
				settingKey="sparql.dropGraphQuery"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textarea
					className='monospace'
					rows={12}
					value={String(settings['sparql.dropGraphQuery']?.value ?? '')}
					onInput={(e: any) => onUpdate('sparql.dropGraphQuery', (e.target as HTMLTextAreaElement).value)}
				/>
			</SettingRow>
			<SettingRow
				label={settings['sparql.describeQueryTemplate']?.title ?? ''}
				description={settings['sparql.describeQueryTemplate']?.description ?? ''}
				settingKey="sparql.describeQueryTemplate"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textarea
					className='monospace'
					rows={12}
					value={String(settings['sparql.describeQueryTemplate']?.value ?? '')}
					onInput={(e: any) => onUpdate('sparql.describeQueryTemplate', (e.target as HTMLTextAreaElement).value)}
				/>
			</SettingRow>
			<div className="settings-subsection">
				<div className="settings-group-title">
					Inference <span className="badge-experimental">Experimental</span>
				</div>
				<SettingRow
					label="Enable inference toggle"
					description="Show the inference toggle button in the SPARQL connection view."
					settingKey="inference.enabled"
					settings={settings}
					onScopeChange={onScopeChange}
				>
					<vscode-checkbox
						checked={settings['inference.enabled']?.value === true}
						onChange={(e: any) => onUpdate('inference.enabled', (e.target as HTMLInputElement).checked)}
					>
						Enabled
					</vscode-checkbox>
				</SettingRow>
				<SettingRow
					label={settings['sparql.defaultInferenceEnabled']?.title ?? ''}
					description={settings['sparql.defaultInferenceEnabled']?.description ?? ''}
					settingKey="sparql.defaultInferenceEnabled"
					settings={settings}
					onScopeChange={onScopeChange}
				>
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
