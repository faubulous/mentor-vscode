import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader, SettingRow } from '../components/setting-row';

import '@vscode-elements/elements/dist/vscode-checkbox';
import '@vscode-elements/elements/dist/vscode-single-select';
import '@vscode-elements/elements/dist/vscode-option';
import '@vscode-elements/elements/dist/vscode-textfield';

export interface EditorGeneralSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function EditorGeneralSection({ settings, onUpdate, onScopeChange, onBulkScope }: EditorGeneralSectionProps) {
	const keys = [
		'editor.codeLensEnabled',
		'prefixes.autoDefinePrefixes',
		'prefixes.prefixDefinitionMode',
		'prefixes.queryParameterName',
	];

	return (
		<div>
			<SectionHeader title="Editor" keys={keys} settings={settings} onBulkScope={onBulkScope} />
			<SettingRow
				label="Enable code lens"
				description="Show code lens actions above class definitions and property declarations."
				settingKey="editor.codeLensEnabled"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-checkbox
					checked={settings['editor.codeLensEnabled']?.value === true}
					onChange={(e: any) => onUpdate('editor.codeLensEnabled', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow
				label="Auto-define prefixes"
				description="Automatically declare namespace prefixes in the document header when a URI is used."
				settingKey="prefixes.autoDefinePrefixes"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-checkbox
					checked={settings['prefixes.autoDefinePrefixes']?.value === true}
					onChange={(e: any) => onUpdate('prefixes.autoDefinePrefixes', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow
				label="Prefix definition mode"
				description="Controls where new prefix declarations are inserted in the document."
				settingKey="prefixes.prefixDefinitionMode"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-single-select
					value={String(settings['prefixes.prefixDefinitionMode']?.value ?? 'Append')}
					onChange={(e: any) => onUpdate('prefixes.prefixDefinitionMode', (e.target as HTMLSelectElement).value)}
				>
					<vscode-option value="Append">Append</vscode-option>
					<vscode-option value="Sorted">Sorted</vscode-option>
				</vscode-single-select>
			</SettingRow>
			<SettingRow
				label="Workspace URI query parameter"
				description="Name of the query parameter appended to workspace: URIs to identify the workspace."
				settingKey="prefixes.queryParameterName"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textfield
					value={String(settings['prefixes.queryParameterName']?.value ?? '')}
					placeholder="workspace"
					onInput={(e: any) => onUpdate('prefixes.queryParameterName', (e.target as HTMLInputElement).value)}
				/>
			</SettingRow>
		</div>
	);
}
