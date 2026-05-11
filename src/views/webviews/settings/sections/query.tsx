import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader, SettingRow } from '../components/setting-row';

import '@vscode-elements/elements/dist/vscode-checkbox';
import '@vscode-elements/elements/dist/vscode-textfield';
import '@vscode-elements/elements/dist/vscode-textarea';

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
	];

	return (
		<div>
			<SectionHeader title="Query" keys={keys} settings={settings} onBulkScope={onBulkScope} />
			<SettingRow
				label="Default inference enabled"
				description="Enable inference by default for new SPARQL connections."
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
			<SettingRow
				label="Query timeout"
				description="Timeout in milliseconds for SPARQL query execution. Set to 0 to disable."
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
				label="List graphs query"
				description="SPARQL query template used to list named graphs in a SPARQL endpoint."
				settingKey="sparql.listGraphsQuery"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textarea
					className="editor-font-textarea"
					value={String(settings['sparql.listGraphsQuery']?.value ?? '')}
					rows={4}
					onInput={(e: any) => onUpdate('sparql.listGraphsQuery', (e.target as HTMLTextAreaElement).value)}
				/>
			</SettingRow>
			<SettingRow
				label="Drop graph query"
				description="SPARQL query template used to drop a named graph from a SPARQL endpoint."
				settingKey="sparql.dropGraphQuery"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textarea
					className="editor-font-textarea"
					value={String(settings['sparql.dropGraphQuery']?.value ?? '')}
					rows={4}
					onInput={(e: any) => onUpdate('sparql.dropGraphQuery', (e.target as HTMLTextAreaElement).value)}
				/>
			</SettingRow>
			<SettingRow
				label="Describe query template"
				description="SPARQL DESCRIBE query template. Use {{uri}} as the placeholder for the resource URI."
				settingKey="sparql.describeQueryTemplate"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textarea
					className="editor-font-textarea"
					value={String(settings['sparql.describeQueryTemplate']?.value ?? '')}
					rows={4}
					onInput={(e: any) => onUpdate('sparql.describeQueryTemplate', (e.target as HTMLTextAreaElement).value)}
				/>
			</SettingRow>
		</div>
	);
}
