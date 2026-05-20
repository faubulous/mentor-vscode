import { VscodeSingleSelect } from '@vscode-elements/elements';
import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../../components/setting-row';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import { useBulkScopeMenuItems } from '../../components/use-bulk-scope-menu-items';
import { useVscodeElementRef } from '@src/views/webviews/webview-hooks';
import { ObjectListEditor } from '../../components/object-list-editor';
import { SettingsSectionProps } from '../../settings-section-props';
import { MENTOR_SOURCE } from '../../settings-types';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export const editorGeneralSection = {
	id: 'editor.general',
	label: 'General',
	component: EditorGeneralSection,
	keys: [
		'editor.codeLensEnabled',
		'prefixes.autoDefinePrefixes',
		'prefixes.prefixDefinitionMode',
		'namespaces',
		'prefixes.queryParameterName',
	],
} as const satisfies SettingsSectionDescriptor;

export function EditorGeneralSection({ keys, settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const namespaces = (settings['namespaces']?.value as { uri: string; defaultPrefix: string }[]) ?? [];
	const rowProps = useSettingRowProps(MENTOR_SOURCE, settings, setScope);
	const menuItems = useBulkScopeMenuItems(MENTOR_SOURCE, [...keys], settings, onBulkScope);

	const prefixDefinitionModeRef = useVscodeElementRef<VscodeSingleSelect>(
		'change',
		(element) => onUpdate(MENTOR_SOURCE, 'prefixes.prefixDefinitionMode', element.value)
	);

	return (
		<div>
			<FormSectionHeader title={editorGeneralSection.label} menuItems={menuItems} large />
			<SettingRow {...rowProps('editor.codeLensEnabled')}>
				<vscode-checkbox
					checked={settings['editor.codeLensEnabled']?.value === true}
					onChange={(e: any) => onUpdate(MENTOR_SOURCE, 'editor.codeLensEnabled', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow {...rowProps('prefixes.autoDefinePrefixes')}>
				<vscode-checkbox
					checked={settings['prefixes.autoDefinePrefixes']?.value === true}
					onChange={(e: any) => onUpdate(MENTOR_SOURCE, 'prefixes.autoDefinePrefixes', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow {...rowProps('prefixes.prefixDefinitionMode')}>
				<vscode-single-select
					ref={prefixDefinitionModeRef}
					value={String(settings['prefixes.prefixDefinitionMode']?.value ?? 'Append')}
				>
					{(settings['prefixes.prefixDefinitionMode']?.enumOptions ?? []).map(o => (
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
					onChange={v => onUpdate(MENTOR_SOURCE, 'namespaces', v)}
				/>
			</SettingRow>
			<SettingRow {...rowProps('prefixes.queryParameterName')}>
				<vscode-textfield
					value={String(settings['prefixes.queryParameterName']?.value ?? '')}
					placeholder="workspace"
					onInput={(e: any) => onUpdate(MENTOR_SOURCE, 'prefixes.queryParameterName', (e.target as HTMLInputElement).value)}
				/>
			</SettingRow>
		</div>
	);
}