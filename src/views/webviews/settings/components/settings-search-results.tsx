import { SettingsSectionId, SETTINGS_SECTION_TITLES, SETTINGS_SEARCH_ENTRIES } from '../sections';
import type { SettingState } from '../settings-types';

type SettingsSearchEntry = { section: SettingsSectionId; key: string; label?: string; description?: string };

export interface SearchResultsProps {
	searchTerm: string;

	settings: Record<string, SettingState>;

	onNavigate: (section: SettingsSectionId) => void;
}

export function SearchResults({ searchTerm, settings, onNavigate }: SearchResultsProps) {
	const term = searchTerm.toLowerCase();

	const getLabel = (entry: SettingsSearchEntry) =>
		settings[entry.key]?.title || entry.label || entry.key;

	const getDescription = (entry: SettingsSearchEntry) =>
		settings[entry.key]?.description || entry.description || '';

	const results = SETTINGS_SEARCH_ENTRIES.filter(entry => {
		const label = getLabel(entry).toLowerCase();
		const description = getDescription(entry).toLowerCase();
		const sectionLabel = (SETTINGS_SECTION_TITLES[entry.section] ?? entry.section).toLowerCase();

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
					<div className="search-result-breadcrumb">{SETTINGS_SECTION_TITLES[entry.section] ?? entry.section}</div>
					<div className="search-result-label">{getLabel(entry)}</div>
					<div className="search-result-description">{getDescription(entry)}</div>
				</div>
			))}
		</div>
	);
}
