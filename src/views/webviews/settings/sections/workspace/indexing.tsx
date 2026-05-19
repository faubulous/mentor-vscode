import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { SettingRow } from '../../components/setting-row';
import { StringListEditor } from '../../components/string-list-editor';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import { useBulkScopeMenuItems } from '../../components/use-bulk-scope-menu-items';
import { SettingsSectionProps } from '../../settings-section-props';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

export function WorkspaceIndexingSection({ keys, settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(settings, setScope);
	const menuItems = useBulkScopeMenuItems([...keys], settings, onBulkScope);

	return (
		<div>
			<FormSectionHeader title={workspaceIndexingDescriptor.label} menuItems={menuItems} large />
			<SettingRow {...rowProps('index.maxFileSize')}>
				<vscode-textfield
					value={String(settings['index.maxFileSize']?.value ?? 1048576)}
					type="number"
					onInput={(e: any) => onUpdate('index.maxFileSize', Number((e.target as HTMLInputElement).value))}
				/>
			</SettingRow>
			<SettingRow {...rowProps('index.useGitIgnore')}>
				<vscode-checkbox
					checked={settings['index.useGitIgnore']?.value === true}
					onChange={(e: any) => onUpdate('index.useGitIgnore', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow {...rowProps('index.ignoreFolders')}>
				<StringListEditor
					items={(settings['index.ignoreFolders']?.value as string[]) ?? []}
					placeholder="**/node_modules"
					onChange={v => onUpdate('index.ignoreFolders', v)}
				/>
			</SettingRow>
			<SettingRow {...rowProps('index.includeFiles')}>
				<StringListEditor
					items={(settings['index.includeFiles']?.value as string[]) ?? []}
					placeholder="**/*.ttl"
					onChange={v => onUpdate('index.includeFiles', v)}
				/>
			</SettingRow>
		</div>
	);
}

export const workspaceIndexingDescriptor = {
	id: 'indexing',
	group: 'workspace',
	label: 'Indexing',
	component: WorkspaceIndexingSection,
	keys: [
		'index.useGitIgnore',
		'index.ignoreFolders',
		'index.includeFiles',
		'index.maxFileSize',
	],
} as const satisfies SettingsSectionDescriptor;
