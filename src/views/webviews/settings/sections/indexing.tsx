import { SettingScope, SettingState } from '../settings-types';
import { SectionHeader } from '../components/section-header';
import { SettingRow } from '../components/setting-row';
import { useSettingRowProps } from '../components/use-setting-row-props';
import { StringListEditor } from '../components/string-list-editor';
import { SECTION_TITLES } from '../settings-metadata';

export interface IndexingSectionProps {
	keys: string[];
	settings: Record<string, SettingState>;
	onUpdate: (key: string, value: unknown) => void;
	onScopeChange: (key: string, scope: SettingScope, currentValue: unknown) => void;
	onBulkScope: (keys: string[], scope: 'user' | 'workspace') => void;
}

export function IndexingSection({ keys, settings, onUpdate, onScopeChange, onBulkScope }: IndexingSectionProps) {
	const rowProps = useSettingRowProps(settings, onScopeChange);
	return (
		<div>
			<SectionHeader title={SECTION_TITLES['indexing']} keys={keys} settings={settings} onBulkScope={onBulkScope} />

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
