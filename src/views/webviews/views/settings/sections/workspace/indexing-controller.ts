import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { IWorkspaceIndexerService } from '@src/services/core';
import { SettingsSectionId } from '..';
import { SettingsSectionController } from '../../settings-section-controller';
import { SettingsSectionMessages } from '../../settings-panel-messages';
import { IndexingStatsView } from './indexing-messages';

const SECTION_ID = 'workspace.indexing' satisfies SettingsSectionId;

/**
 * Section controller for the Indexing settings section. Surfaces the workspace
 * indexer's run statistics (indexed/error/skipped files, duration) plus the live
 * triple count to the dashboard, and proxies the show-log / reindex actions to the
 * corresponding Mentor commands.
 */
export class IndexingSectionController implements SettingsSectionController {
	readonly id: SettingsSectionId = SECTION_ID;

	private _post: (message: SettingsSectionMessages) => void = () => { };

	private _disposables: vscode.Disposable[] = [];

	initialize(post: (message: SettingsSectionMessages) => void): void {
		this._post = post;

		const indexer = container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);

		this._disposables.push(
			indexer.onDidFinishIndexing(() => {
				this._post({ section: SECTION_ID, id: 'IndexingStatsChanged', stats: this._composeStats() });
			})
		);
	}

	async handleMessage(message: SettingsSectionMessages): Promise<boolean> {
		switch (message.id) {
			case 'GetIndexingStats': {
				this._post({ section: SECTION_ID, id: 'IndexingStatsResult', stats: this._composeStats() });

				return true;
			}
			case 'ShowIndexLog': {
				await vscode.commands.executeCommand('mentor.command.showIndexStatus');

				return true;
			}
			case 'ReindexWorkspace': {
				// The onDidFinishIndexing subscription pushes refreshed stats once the run completes.
				await vscode.commands.executeCommand('mentor.command.reindexWorkspace');

				return true;
			}
			case 'DiagnoseWorkspace': {
				// Runs syntax + SHACL diagnostics over the whole workspace.
				await vscode.commands.executeCommand('mentor.command.diagnoseWorkspace');

				return true;
			}
			default: {
				return false;
			}
		}
	}

	/**
	 * Builds the current statistics view from the indexer's last run and the live store size.
	 */
	private _composeStats(): IndexingStatsView {
		const indexer = container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);
		const store = container.resolve<Store>(ServiceToken.Store);

		const statistics = indexer.statistics ?? { indexedFiles: 0, errorCount: 0, skippedFiles: 0, durationMs: 0 };

		// Without a workspace no indexing run is ever started, so `indexingFinished`
		// stays false forever — do not report that as an in-progress run.
		const hasWorkspace = (vscode.workspace.workspaceFolders?.length ?? 0) > 0;

		return {
			...statistics,
			tripleCount: store.size,
			isIndexing: hasWorkspace && !indexer.indexingFinished,
			hasWorkspace,
		};
	}

	dispose(): void {
		for (const d of this._disposables) {
			d.dispose();
		}

		this._disposables = [];
	}
}
