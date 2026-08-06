import { IndexingStatistics } from '@src/services/core/workspace-indexer.interface';

/**
 * The indexing statistics surfaced to the webview dashboard. Extends the indexer's
 * run statistics with the live triple count and the current indexing state.
 */
export interface IndexingStatsView extends IndexingStatistics {
	/**
	 * The total number of triples currently in the store (all graphs).
	 */
	tripleCount: number;

	/**
	 * Whether an indexing run is currently in progress.
	 */
	isIndexing: boolean;

	/**
	 * Whether a workspace is open. Without a workspace there is nothing to
	 * index and the reindex action is disabled.
	 */
	hasWorkspace: boolean;
}

/**
 * Messages exchanged between the Indexing settings section and its host controller.
 */
export type IndexingMessages =
	| { id: 'GetIndexingStats' }
	| { id: 'IndexingStatsResult'; stats: IndexingStatsView }
	| { id: 'IndexingStatsChanged'; stats: IndexingStatsView }
	| { id: 'ShowIndexLog' }
	| { id: 'ReindexWorkspace' }
	| { id: 'DiagnoseWorkspace' }
	// Live match count for a single include/exclude glob pattern, so the
	// pattern inputs can show how many workspace files a pattern covers.
	| { id: 'GetIndexMatchPreview'; pattern: string }
	| { id: 'IndexMatchPreviewResult'; pattern: string; count: number }
	// Invalidates the webview's cached counts after the candidate file set changed.
	| { id: 'IndexMatchPreviewsInvalidated' }
	// Opens the interactive pattern editor (a host quick pick previewing the
	// matched files); the result carries the confirmed pattern, or none when the
	// editor was dismissed.
	| { id: 'EditIndexPattern'; pattern: string }
	| { id: 'EditIndexPatternResult'; pattern?: string };
