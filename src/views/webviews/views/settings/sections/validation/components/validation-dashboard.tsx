import { StatsDashboard, STATS_PLACEHOLDER, formatDuration } from '../../../components/stats-dashboard';
import { ValidationStatsView } from '../general-messages';

export interface ValidationDashboardProps {
	/**
	 * The current validation statistics, or `undefined` while they are loading.
	 */
	stats?: ValidationStatsView;
}

/**
 * The statistics dashboard shown at the top of the Validation > General
 * settings section, mirroring the indexing dashboard: the outcome of the last
 * batch validation run.
 */
export function ValidationDashboard({ stats }: ValidationDashboardProps) {
	const num = (value: number | undefined) => (value === undefined ? STATS_PLACEHOLDER : value.toLocaleString());

	return (
		<StatsDashboard
			metrics={[
				{ value: num(stats?.validatedFiles), label: 'Validated Files' },
				{ value: num(stats?.skippedFiles), label: 'Skipped Files' },
				{ value: num(stats?.warningCount), label: 'Warnings' },
				{ value: num(stats?.errorCount), label: 'Errors', error: stats !== undefined && stats.errorCount > 0 },
				{ value: stats ? formatDuration(stats.durationMs) : STATS_PLACEHOLDER, label: 'Time' },
			]}
		/>
	);
}
