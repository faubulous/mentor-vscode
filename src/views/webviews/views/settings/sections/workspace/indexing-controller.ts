import * as vscode from 'vscode';
import picomatch from 'picomatch';
import { container } from 'tsyringe';
import { Store } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { IWorkspaceFileService, IWorkspaceIndexerService } from '@src/services/core';
import { IDocumentFactory } from '@src/services/document';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { normalizeGlobPattern } from '@src/utilities/glob';
import { SettingsSectionId } from '..';
import { SettingsSectionController } from '../../settings-section-controller';
import { SettingsSectionMessages } from '../../settings-panel-messages';
import { showPatternEditor } from '../../show-pattern-editor';
import { IndexingStatsView } from './indexing-messages';

const SECTION_ID = 'workspace.indexing' satisfies SettingsSectionId;

/**
 * A file the indexing patterns are matched against.
 */
interface IndexCandidate {
	/**
	 * The workspace-relative path, i.e. the path space the indexer matches in.
	 */
	path: string;

	/**
	 * The file itself, opened when it is picked in the pattern editor.
	 */
	uri: vscode.Uri;
}

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

	/**
	 * Every file Mentor could index, i.e. all files with a supported extension
	 * *before* the configured exclusions are applied, with their
	 * workspace-relative path. Match previews are counted against these, so an
	 * exclusion pattern reports the files it removes rather than zero.
	 * Enumerating them walks the workspace, so the list is cached until the file
	 * set changes.
	 */
	private _candidates: Promise<IndexCandidate[]> | undefined;

	initialize(post: (message: SettingsSectionMessages) => void): void {
		this._post = post;

		const indexer = container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);
		const fileService = container.resolve<IWorkspaceFileService>(ServiceToken.WorkspaceFileService);

		this._disposables.push(
			indexer.onDidFinishIndexing(() => {
				this._post({ section: SECTION_ID, id: 'IndexingStatsChanged', stats: this._composeStats() });
			}),
			// Files created or deleted in the workspace change what the patterns
			// match; drop the cache and let the webview re-request its counts.
			fileService.onDidChangeFiles(() => {
				this._candidates = undefined;
				this._post({ section: SECTION_ID, id: 'IndexMatchPreviewsInvalidated' });
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
			case 'GetIndexMatchPreview': {
				const { pattern } = message;

				this._post({
					section: SECTION_ID,
					id: 'IndexMatchPreviewResult',
					pattern,
					count: await this._countMatches(pattern),
				});

				return true;
			}
			case 'EditIndexPattern': {
				// Enumerate once and reuse for every keystroke of the live preview.
				const candidates = await this._getCandidates();

				const pattern = await showPatternEditor({
					pattern: message.pattern,
					title: 'Edit Index Pattern',
					placeholder: 'Glob pattern relative to the workspace, e.g. data/** or **/*.ttl',
					getMatches: (value) => this._getMatches(value, candidates),
				});

				this._post({ section: SECTION_ID, id: 'EditIndexPatternResult', pattern });

				return true;
			}
			default: {
				return false;
			}
		}
	}

	/**
	 * Counts the indexable workspace files a single glob pattern matches, using
	 * the same normalization and workspace-relative path space as the indexer's
	 * include matching and the file service's exclude filtering.
	 * @param pattern The raw pattern as typed into the settings input.
	 * @returns The number of matched files; `0` for an empty or invalid pattern.
	 */
	private async _countMatches(pattern: string): Promise<number> {
		return (await this._getMatches(pattern, await this._getCandidates())).length;
	}

	/**
	 * The candidates a pattern matches. Compiling the matcher is cheap enough to
	 * repeat per call, which keeps the pattern editor's live preview simple.
	 * @param pattern The raw pattern as typed into the settings input.
	 * @param candidates The candidates to match against.
	 */
	private _getMatches(pattern: string, candidates: readonly IndexCandidate[]): IndexCandidate[] {
		const normalized = normalizeGlobPattern(pattern);

		if (!normalized) {
			return [];
		}

		let isMatch: picomatch.Matcher;

		try {
			isMatch = picomatch(normalized, { dot: true });
		} catch {
			// Invalid globs are flagged in the input itself; report no matches.
			return [];
		}

		return candidates.filter(candidate => isMatch(candidate.path));
	}

	/**
	 * Enumerates all files with a supported extension, ignoring the configured
	 * exclusions (see {@link _candidates}). Concurrent callers share one
	 * enumeration.
	 */
	private _getCandidates(): Promise<IndexCandidate[]> {
		if (!this._candidates) {
			this._candidates = this._enumerateCandidates();
		}

		return this._candidates;
	}

	private async _enumerateCandidates(): Promise<IndexCandidate[]> {
		const documentFactory = container.resolve<IDocumentFactory>(ServiceToken.DocumentFactory);
		const extensions = Object.keys(documentFactory.supportedExtensions);
		const include = `{${extensions.map(ext => `**/*${ext}`).join(',')}}`;

		const candidates: IndexCandidate[] = [];

		for (const folder of vscode.workspace.workspaceFolders ?? []) {
			// `.git` never holds indexable sources but is large; everything else
			// is enumerated so exclusion patterns report truthful counts.
			const found = await vscode.workspace.findFiles(
				new vscode.RelativePattern(folder.uri, include),
				new vscode.RelativePattern(folder.uri, '**/.git/**')
			);

			for (const uri of found) {
				// The glob can match mid-path; keep only real supported files.
				if (!documentFactory.isSupportedFile(uri)) {
					continue;
				}

				const workspaceUri = WorkspaceUri.toWorkspaceUri(uri);

				if (workspaceUri) {
					candidates.push({ path: workspaceUri.relativePath, uri });
				}
			}
		}

		return candidates;
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
