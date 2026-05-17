import { VscodeSingleSelect } from '@vscode-elements/elements';
import { SettingScope, SettingState } from '../settings-types';
import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../components/setting-row';
import { useSettingRowProps } from '../components/use-setting-row-props';
import { useBulkScopeMenuItems } from '../components/use-bulk-scope-menu-items';
import { SECTION_TITLES, getEnumOptions } from '../settings-metadata';
import { useVscodeElementRef } from '@src/views/webviews/webview-hooks';

import { ObjectListEditor } from '../components/object-list-editor';

export interface EditorGeneralSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	setScope: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function EditorGeneralSection({ settings, onUpdate, setScope, onBulkScope }: EditorGeneralSectionProps) {
	const keys = [
		'editor.codeLensEnabled',
		'prefixes.autoDefinePrefixes',
		'prefixes.prefixDefinitionMode',
		'prefixes.queryParameterName',
	];

	const namespaces = (settings['namespaces']?.value as { uri: string; defaultPrefix: string }[]) ?? [];
	const rowProps = useSettingRowProps(settings, setScope);
	const menuItems = useBulkScopeMenuItems(keys, settings, onBulkScope);

	const prefixDefinitionModeRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => onUpdate('prefixes.prefixDefinitionMode', element.value)
	);

	return (
		<div>
			<FormSectionHeader title={SECTION_TITLES['editor.general']} menuItems={menuItems} large />
			<SettingRow {...rowProps('editor.codeLensEnabled')}>
				<vscode-checkbox
					checked={settings['editor.codeLensEnabled']?.value === true}
					onChange={(e: any) => onUpdate('editor.codeLensEnabled', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow {...rowProps('prefixes.autoDefinePrefixes')}>
				<vscode-checkbox
					checked={settings['prefixes.autoDefinePrefixes']?.value === true}
					onChange={(e: any) => onUpdate('prefixes.autoDefinePrefixes', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow {...rowProps('prefixes.prefixDefinitionMode')}>
				<vscode-single-select
					ref={prefixDefinitionModeRef}
					value={String(settings['prefixes.prefixDefinitionMode']?.value ?? 'Append')}
				>
					{getEnumOptions('prefixes.prefixDefinitionMode').map(o => (
						<vscode-option key={o.value} value={o.value}>{o.label}</vscode-option>
					))}
				</vscode-single-select>
			</SettingRow>
			<SettingRow {...rowProps('namespaces')}>
				<ObjectListEditor
					items={namespaces}
					fields={[
						{ key: 'defaultPrefix', label: 'Prefix', placeholder: 'ex', className: 'col-prefix' },
						{ key: 'uri', label: 'URI', placeholder: 'https://example.org/' },
					]}
					onChange={v => onUpdate('namespaces', v)}
				/>
			</SettingRow>
			<SettingRow {...rowProps('prefixes.queryParameterName')}>
				<vscode-textfield
					value={String(settings['prefixes.queryParameterName']?.value ?? '')}
					placeholder="workspace"
					onInput={(e: any) => onUpdate('prefixes.queryParameterName', (e.target as HTMLInputElement).value)}
				/>
			</SettingRow>
		</div>
	);
}
