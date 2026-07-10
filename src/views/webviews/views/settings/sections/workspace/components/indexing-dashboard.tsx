import { useStylesheet } from '@src/views/webviews/hooks';
import { IndexingStatsView } from '../indexing-messages';
import stylesheet from './indexing-dashboard.css';

export interface IndexingDashboardProps {
	/**
	 * The current indexing statistics, or `undefined` while they are loading.
	 */
	stats?: IndexingStatsView;
}

const PLACEHOLDER = '—';

/**
 * Formats a millisecond duration into a compact human-readable string.
 */
function formatDuration(ms: number): string {
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
 * A prominent statistics dashboard shown at the top of the Indexing settings section.
 * Renders large metric values with small labels below, separated by thin vertical lines.
 */
export function IndexingDashboard({ stats }: IndexingDashboardProps) {
	useStylesheet('mentor-indexing-dashboard-styles', stylesheet);

	const num = (value: number | undefined) => (value === undefined ? PLACEHOLDER : value.toLocaleString());

	return (
		<div className="indexing-dashboard">
			<div className="indexing-dashboard-metric">
				<span className="indexing-dashboard-value">{num(stats?.tripleCount)}</span>
				<span className="indexing-dashboard-label">Triples</span>
			</div>
			<div className="indexing-dashboard-metric">
				<span className="indexing-dashboard-value">{num(stats?.indexedFiles)}</span>
				<span className="indexing-dashboard-label">Indexed files</span>
			</div>
			<div className={`indexing-dashboard-metric${stats && stats.errorCount > 0 ? ' has-errors' : ''}`}>
				<span className="indexing-dashboard-value">{num(stats?.errorCount)}</span>
				<span className="indexing-dashboard-label">Errors</span>
			</div>
			<div className="indexing-dashboard-metric">
				<span className="indexing-dashboard-value">{num(stats?.skippedFiles)}</span>
				<span className="indexing-dashboard-label">Skipped</span>
			</div>
			<div className="indexing-dashboard-metric">
				<span className="indexing-dashboard-value">{stats ? formatDuration(stats.durationMs) : PLACEHOLDER}</span>
				<span className="indexing-dashboard-label">Time</span>
			</div>
		</div>
	);
}
