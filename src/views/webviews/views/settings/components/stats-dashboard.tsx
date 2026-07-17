import { useStylesheet } from '@src/views/webviews/hooks';
import stylesheet from './stats-dashboard.css';

/**
 * A single metric shown on a {@link StatsDashboard}.
 */
export interface StatsDashboardMetric {
	/**
	 * The formatted metric value, e.g. `1,234` or `1.2 s`.
	 */
	value: string;

	/**
	 * The small label rendered below the value.
	 */
	label: string;

	/**
	 * Highlights the value in the error color, e.g. for non-zero error counts.
	 */
	error?: boolean;
}

export interface StatsDashboardProps {
	metrics: StatsDashboardMetric[];
}

/**
 * The placeholder shown for metrics whose statistics are still loading.
 */
export const STATS_PLACEHOLDER = '—';

/**
 * Formats a millisecond duration into a compact human-readable string.
 */
export function formatDuration(ms: number): string {
	if (ms < 1000) {
		return `${ms} ms`;
	}

	if (ms < 60000) {
		return `${(ms / 1000).toFixed(1)} s`;
	}

	const minutes = Math.floor(ms / 60000);
	const seconds = Math.round((ms % 60000) / 1000);

	return `${minutes}m ${seconds}s`;
}

/**
 * A prominent statistics dashboard shown at the top of a settings section.
 * Renders large metric values with small labels below, separated by thin
 * vertical lines. Used by the indexing and validation sections.
 */
export function StatsDashboard({ metrics }: StatsDashboardProps) {
	useStylesheet('mentor-stats-dashboard-styles', stylesheet);

	return (
		<div className="stats-dashboard">
			{metrics.map(metric => (
				<div key={metric.label} className={`stats-dashboard-metric${metric.error ? ' has-errors' : ''}`}>
					<span className="stats-dashboard-value">{metric.value}</span>
					<span className="stats-dashboard-label">{metric.label}</span>
				</div>
			))}
		</div>
	);
}
