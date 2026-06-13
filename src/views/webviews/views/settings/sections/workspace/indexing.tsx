import { useState, useEffect, useCallback } from 'react';
import { FormSectionHeader } from '@src/views/webviews/components/form-section-header';
import { useScopedWebviewMessaging } from '@src/views/webviews/webview-hooks';
import { SettingRow } from '../../components/setting-row';
import { StringListEditor } from '../../components/string-list-editor';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import { useBulkScopeMenuItems } from '../../components/use-bulk-scope-menu-items';
import { SettingsSectionProps } from '../../settings-section-props';
import { MENTOR_SOURCE } from '../../settings-types';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';
import { IndexingDashboard } from './indexing-dashboard';
import { IndexingMessages, IndexingStatsView } from './indexing-messages';

export const workspaceIndexingSection = {
	id: 'workspace.indexing',
	label: 'Indexing',
	component: WorkspaceIndexingSection,
	keys: [
		'index.useGitIgnore',
		'index.excludeFiles',
		'index.includeFiles',
		'index.maxFileSize',
	],
} as const satisfies SettingsSectionDescriptor;

export function WorkspaceIndexingSection({ keys, settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SOURCE, settings, setScope);
	const menuItems = useBulkScopeMenuItems(MENTOR_SOURCE, [...keys], settings, onBulkScope);

	const [stats, setStats] = useState<IndexingStatsView>();
	const [reindexing, setReindexing] = useState(false);

	const handleMessage = useCallback((message: IndexingMessages) => {
		if (message.id === 'IndexingStatsResult' || message.id === 'IndexingStatsChanged') {
			setStats(message.stats);

			if (!message.stats.isIndexing) {
				setReindexing(false);
			}
		}
	}, []);

	const messaging = useScopedWebviewMessaging<IndexingMessages>('workspace.indexing', handleMessage);

	useEffect(() => {
		messaging?.postMessage({ id: 'GetIndexingStats' });
	}, [messaging]);

	const isBusy = reindexing || stats?.isIndexing === true;

	const handleShowLog = () => messaging?.postMessage({ id: 'ShowIndexLog' });

	const handleReindex = () => {
		setReindexing(true);
		messaging?.postMessage({ id: 'ReindexWorkspace' });
	};

	return (
		<div>
			<FormSectionHeader title={workspaceIndexingSection.label} menuItems={menuItems} large />
			<IndexingDashboard stats={stats} />
			<div className="indexing-actions">
				<vscode-toolbar-button className="primary" onClick={handleShowLog}>
					<span className="codicon codicon-output"></span>
					<span className="label">Show Index Log</span>
				</vscode-toolbar-button>
				<vscode-toolbar-button className="primary" disabled={isBusy} onClick={handleReindex}>
					<span className={`codicon ${isBusy ? 'codicon-sync codicon-modifier-spin' : 'codicon-refresh'}`}></span>
					<span className="label">Reindex Workspace</span>
				</vscode-toolbar-button>
			</div>
			<SettingRow {...rowProps('index.maxFileSize')}>
				<vscode-textfield
					className="setting-input-md"
					value={String(settings['index.maxFileSize']?.value ?? 1048576)}
					type="number"
					onInput={(e: any) => onUpdate(MENTOR_SOURCE, 'index.maxFileSize', Number((e.target as HTMLInputElement).value))}
				>
					<span slot="content-after" className="setting-input-suffix">bytes</span>
				</vscode-textfield>
			</SettingRow>
			<SettingRow {...rowProps('index.useGitIgnore')}>
				<vscode-checkbox
					checked={settings['index.useGitIgnore']?.value === true}
					onChange={(e: any) => onUpdate(MENTOR_SOURCE, 'index.useGitIgnore', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow {...rowProps('index.excludeFiles')}>
				<StringListEditor
					items={(settings['index.excludeFiles']?.value as string[]) ?? []}
					placeholder="**/node_modules/**"
					onChange={v => onUpdate(MENTOR_SOURCE, 'index.excludeFiles', v)}
				/>
			</SettingRow>
			<SettingRow {...rowProps('index.includeFiles')}>
				<StringListEditor
					items={(settings['index.includeFiles']?.value as string[]) ?? []}
					placeholder="**/*.ttl"
					onChange={v => onUpdate(MENTOR_SOURCE, 'index.includeFiles', v)}
				/>
			</SettingRow>
		</div>
	);
}