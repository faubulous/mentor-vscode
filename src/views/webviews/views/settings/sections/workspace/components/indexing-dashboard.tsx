import { StatsDashboard, STATS_PLACEHOLDER, formatDuration } from '../../../components/stats-dashboard';
import { IndexingStatsView } from '../indexing-messages';

export interface IndexingDashboardProps {
	/**
	 * The current indexing statistics, or `undefined` while they are loading.
	 */
	stats?: IndexingStatsView;
}

/**
 * The statistics dashboard shown at the top of the Indexing settings section.
 */
export function IndexingDashboard({ stats }: IndexingDashboardProps) {
	const num = (value: number | undefined) => (value === undefined ? STATS_PLACEHOLDER : value.toLocaleString());

	return (
		<StatsDashboard
			metrics={[
				{ value: num(stats?.indexedFiles), label: 'Indexed Files' },
				{ value: num(stats?.skippedFiles), label: 'Skipped Files' },
				{ value: num(stats?.errorCount), label: 'Errors', status: stats !== undefined && stats.errorCount > 0 ? 'error' : undefined },
				{ value: num(stats?.tripleCount), label: 'Triples' },
				{ value: stats ? formatDuration(stats.durationMs) : STATS_PLACEHOLDER, label: 'Time' },
			]}
		/>
	);
}
