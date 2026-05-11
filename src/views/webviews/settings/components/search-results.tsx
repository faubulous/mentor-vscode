import { NavSection } from '../settings-metadata';
import { CatalogEntry, SETTINGS_CATALOG } from '../settings-catalog';

export type { CatalogEntry };

export interface SearchResultsProps {
	searchTerm: string;
	onNavigate: (section: NavSection) => void;
}

export function SearchResults({ searchTerm, onNavigate }: SearchResultsProps) {
	const term = searchTerm.toLowerCase();
	const results = SETTINGS_CATALOG.filter(entry =>
		entry.label.toLowerCase().includes(term) ||
		entry.description.toLowerCase().includes(term) ||
		entry.sectionLabel.toLowerCase().includes(term)
	);

	if (results.length === 0) {
		return <div className="search-empty">No settings found for "{searchTerm}".</div>;
	}

	return (
		<div className="search-results">
			{results.map((entry, i) => (
				<div
					key={i}
					className="search-result-item"
					onClick={() => onNavigate(entry.section)}
				>
					<div className="search-result-breadcrumb">{entry.sectionLabel}</div>
					<div className="search-result-label">{entry.label}</div>
					<div className="search-result-description">{entry.description}</div>
				</div>
			))}
		</div>
	);
}
