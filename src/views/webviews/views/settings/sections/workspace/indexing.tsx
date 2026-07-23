import { useState, useEffect, useCallback } from 'react';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { useScopedWebviewMessaging } from '@src/views/webviews/hooks';
import { SettingRow } from '../../components/setting-row';
import { StringListEditor } from '../../components/string-list-editor';
import { useSettingRowProps } from '../../hooks/use-setting-row-props';
import { useBulkScopeMenuItems } from '../../hooks/use-bulk-scope-menu-items';
import { SettingsSectionProps } from '../../settings-section-props';
import { MENTOR_SETTINGS_SOURCE } from '../../settings-types';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';
import { IndexingDashboard } from './components/indexing-dashboard';
import { IndexingMessages, IndexingStatsView } from './indexing-messages';

export const workspaceIndexingSection = {
	id: 'workspace.indexing',
	label: 'Indexing',
	component: WorkspaceIndexingSection,
	defaultScope: 'workspace',
	keys: [
		'index.useGitIgnore',
		'index.excludeFiles',
		'index.includeFiles',
		'index.maxFileSize',
		'index.diagnoseFiles',
	],
} as const satisfies SettingsSectionDescriptor;

function WorkspaceIndexingSection({ keys, settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SETTINGS_SOURCE, settings, setScope);
	const menuItems = useBulkScopeMenuItems(MENTOR_SETTINGS_SOURCE, [...keys], settings, onBulkScope);

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

	// Without a workspace there is nothing to index — the reindex button is
	// disabled instead of showing a spinner that would never stop.
	const hasWorkspace = stats?.hasWorkspace !== false;

	const handleShowLog = () => messaging?.postMessage({ id: 'ShowIndexLog' });

	const handleReindex = () => {
		setReindexing(true);
		messaging?.postMessage({ id: 'ReindexWorkspace' });
	};

	return (
		<div>
			<SectionHeader title={workspaceIndexingSection.label} menuItems={menuItems} variant="title" />
			<IndexingDashboard stats={stats} />
			<div className="stats-dashboard-actions">
				<vscode-toolbar-button className="primary" onClick={handleShowLog}>
					<span className="codicon codicon-output"></span>
					<span className="label">Show Index Log</span>
				</vscode-toolbar-button>
				<vscode-toolbar-button
					className="primary"
					disabled={isBusy || !hasWorkspace}
					title={hasWorkspace ? undefined : 'Open a folder or workspace to enable indexing'}
					onClick={handleReindex}
				>
					<span className={`codicon ${isBusy ? 'codicon-sync codicon-modifier-spin' : 'codicon-refresh'}`}></span>
					<span className="label">Reindex Workspace</span>
				</vscode-toolbar-button>
			</div>
			<SettingRow {...rowProps('index.maxFileSize')}>
				<vscode-textfield
					className="setting-input-md"
					value={String(settings['index.maxFileSize']?.value ?? 1048576)}
					type="number"
					onInput={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'index.maxFileSize', Number((e.target as HTMLInputElement).value))}
				>
					<span slot="content-after" className="setting-input-suffix">bytes</span>
				</vscode-textfield>
			</SettingRow>
			<SettingRow {...rowProps('index.diagnoseFiles')}>
				<vscode-checkbox
					checked={settings['index.diagnoseFiles']?.value !== false}
					onChange={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'index.diagnoseFiles', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow {...rowProps('index.useGitIgnore')}>
				<vscode-checkbox
					checked={settings['index.useGitIgnore']?.value === true}
					onChange={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'index.useGitIgnore', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow {...rowProps('index.excludeFiles')}>
				<StringListEditor
					items={(settings['index.excludeFiles']?.value as string[]) ?? []}
					placeholder="**/node_modules/**"
					onChange={v => onUpdate(MENTOR_SETTINGS_SOURCE, 'index.excludeFiles', v)}
				/>
			</SettingRow>
			<SettingRow {...rowProps('index.includeFiles')}>
				<StringListEditor
					items={(settings['index.includeFiles']?.value as string[]) ?? []}
					placeholder="**/*.ttl"
					onChange={v => onUpdate(MENTOR_SETTINGS_SOURCE, 'index.includeFiles', v)}
				/>
			</SettingRow>
		</div>
	);
}