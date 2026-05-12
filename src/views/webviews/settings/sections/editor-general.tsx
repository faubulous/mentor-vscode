import { VscodeSingleSelect } from '@vscode-elements/elements';
import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader, SettingRow } from '../components/setting-row';
import { SECTION_TITLES, getEnumOptions } from '../settings-metadata';
import { useVscodeElementRef } from '@src/views/webviews/webview-hooks';

import '@vscode-elements/elements/dist/vscode-checkbox';
import '@vscode-elements/elements/dist/vscode-single-select';
import '@vscode-elements/elements/dist/vscode-option';
import '@vscode-elements/elements/dist/vscode-textfield';
import { ObjectListEditor } from '../components/object-list-editor';

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

	const namespaces = (settings['namespaces']?.value as { uri: string; defaultPrefix: string }[]) ?? [];

	const prefixDefinitionModeRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => onUpdate('prefixes.prefixDefinitionMode', element.value)
	);

	return (
		<div>
			<SectionHeader title={SECTION_TITLES['editor.general']} keys={keys} settings={settings} onBulkScope={onBulkScope} />
			<SettingRow
				label={settings['editor.codeLensEnabled']?.title ?? ''}
				description={settings['editor.codeLensEnabled']?.description ?? ''}
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
				label={settings['prefixes.autoDefinePrefixes']?.title ?? ''}
				description={settings['prefixes.autoDefinePrefixes']?.description ?? ''}
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
				label={settings['prefixes.prefixDefinitionMode']?.title ?? ''}
				description={settings['prefixes.prefixDefinitionMode']?.description ?? ''}
				settingKey="prefixes.prefixDefinitionMode"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-single-select
					ref={prefixDefinitionModeRef}
					value={String(settings['prefixes.prefixDefinitionMode']?.value ?? 'Append')}
				>
					{getEnumOptions('prefixes.prefixDefinitionMode').map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
			<SettingRow
				label={settings['namespaces']?.title ?? ''}
				description={settings['namespaces']?.description ?? ''}
				settingKey="namespaces"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<ObjectListEditor
					items={namespaces}
					fields={[
						{ key: 'defaultPrefix', label: 'Prefix', placeholder: 'ex', className: 'col-prefix' },
						{ key: 'uri', label: 'URI', placeholder: 'https://example.org/' },
					]}
					onChange={v => onUpdate('namespaces', v)}
				/>
			</SettingRow>
			<SettingRow
				label={settings['prefixes.queryParameterName']?.title ?? ''}
				description={settings['prefixes.queryParameterName']?.description ?? ''}
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
