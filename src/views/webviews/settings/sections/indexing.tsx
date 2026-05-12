import { SettingScope, SettingState } from '../settings-panel-messages';
import { SectionHeader, SettingRow } from '../components/setting-row';
import { StringListEditor } from '../components/string-list-editor';
import { SECTION_TITLES } from '../settings-metadata';

import '@vscode-elements/elements/dist/vscode-checkbox';
import '@vscode-elements/elements/dist/vscode-textfield';

export interface IndexingSectionProps {
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function IndexingSection({ settings, onUpdate, onScopeChange, onBulkScope }: IndexingSectionProps) {
	const keys = ['index.maxFileSize', 'index.useGitIgnore', 'index.ignoreFolders', 'index.includeFiles'];

	return (
		<div>
			<SectionHeader title={SECTION_TITLES['indexing']} keys={keys} settings={settings} onBulkScope={onBulkScope} />
			<SettingRow
				label={settings['index.maxFileSize']?.title ?? ''}
				description={settings['index.maxFileSize']?.description ?? ''}
				settingKey="index.maxFileSize"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-textfield
					value={String(settings['index.maxFileSize']?.value ?? 1048576)}
					type="number"
					onInput={(e: any) => onUpdate('index.maxFileSize', Number((e.target as HTMLInputElement).value))}
				/>
			</SettingRow>
			<SettingRow
				label={settings['index.useGitIgnore']?.title ?? ''}
				description={settings['index.useGitIgnore']?.description ?? ''}
				settingKey="index.useGitIgnore"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<vscode-checkbox
					checked={settings['index.useGitIgnore']?.value === true}
					onChange={(e: any) => onUpdate('index.useGitIgnore', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow
				label={settings['index.ignoreFolders']?.title ?? ''}
				description={settings['index.ignoreFolders']?.description ?? ''}
				settingKey="index.ignoreFolders"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<StringListEditor
					items={(settings['index.ignoreFolders']?.value as string[]) ?? []}
					placeholder="**/node_modules"
					onChange={v => onUpdate('index.ignoreFolders', v)}
				/>
			</SettingRow>
			<SettingRow
				label={settings['index.includeFiles']?.title ?? ''}
				description={settings['index.includeFiles']?.description ?? ''}
				settingKey="index.includeFiles"
				settings={settings}
				onScopeChange={onScopeChange}
			>
				<StringListEditor
					items={(settings['index.includeFiles']?.value as string[]) ?? []}
					placeholder="**/*.ttl"
					onChange={v => onUpdate('index.includeFiles', v)}
				/>
			</SettingRow>
		</div>
	);
}
