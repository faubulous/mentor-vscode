import { NavSection, SETTINGS, SECTION_TITLES, CATALOG_EXTRAS } from '../settings-metadata';
import { SettingState } from '../settings-panel-messages';
import type { CatalogExtra } from '../settings-types';

export interface SearchResultsProps {
	searchTerm: string;
	settings: Record<string, SettingState>;
	onNavigate: (section: NavSection) => void;
}

type SearchEntry = { section: NavSection; key: string; label?: string; description?: string };

const SEARCH_ENTRIES: SearchEntry[] = [
        ...Object.entries(SETTINGS)
                .filter(([_key, meta]) => meta.uiVisible)
                .map(([key, meta]) => ({ section: meta.section, key })),
];

export function SearchResults({ searchTerm, settings, onNavigate }: SearchResultsProps) {
	const term = searchTerm.toLowerCase();

	const getLabel = (entry: SearchEntry) =>
		settings[entry.key]?.title || entry.label || entry.key;
	const getDescription = (entry: SearchEntry) =>
		settings[entry.key]?.description || entry.description || '';

	const results = SEARCH_ENTRIES.filter(entry => {
		const label = getLabel(entry).toLowerCase();
		const description = getDescription(entry).toLowerCase();
		const sectionLabel = (SECTION_TITLES[entry.section] ?? entry.section).toLowerCase();
		return label.includes(term) || description.includes(term) || sectionLabel.includes(term);
	});

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
					<div className="search-result-breadcrumb">{SECTION_TITLES[entry.section] ?? entry.section}</div>
					<div className="search-result-label">{getLabel(entry)}</div>
					<div className="search-result-description">{getDescription(entry)}</div>
				</div>
			))}
		</div>
	);
}
