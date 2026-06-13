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
}

/**
 * Messages exchanged between the Indexing settings section and its host controller.
 */
export type IndexingMessages =
	| { id: 'GetIndexingStats' }
	| { id: 'IndexingStatsResult'; stats: IndexingStatsView }
	| { id: 'IndexingStatsChanged'; stats: IndexingStatsView }
	| { id: 'ShowIndexLog' }
	| { id: 'ReindexWorkspace' };
