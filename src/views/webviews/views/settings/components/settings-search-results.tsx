import { SettingsSectionId, SETTINGS_GROUPS } from '../sections';
import { useListKeyboardNavigation } from '../hooks/use-list-keyboard-navigation';
import type { SettingState } from '../settings-types';

type SettingsSearchEntry = { section: SettingsSectionId; key: string; label?: string; description?: string };

const ALL_SECTIONS = SETTINGS_GROUPS.flatMap(g => [...g.sections]);

const SECTION_TITLES = Object.fromEntries(
	ALL_SECTIONS.map(s => [s.id, s.label]),
) as Record<SettingsSectionId, string>;

const SEARCH_ENTRIES: SettingsSearchEntry[] = ALL_SECTIONS.flatMap(s =>
	s.keys.map(key => ({ section: s.id as SettingsSectionId, key })),
);

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

	const results = SEARCH_ENTRIES.filter(entry => {
		const label = getLabel(entry).toLowerCase();
		const description = getDescription(entry).toLowerCase();
		const sectionLabel = (SECTION_TITLES[entry.section] ?? entry.section).toLowerCase();

		return label.includes(term) || description.includes(term) || sectionLabel.includes(term);
	});

	const resultId = (entry: SettingsSearchEntry) => `${entry.section}:${entry.key}`;

	// The same arrow/Home/End/Enter navigation as the settings lists.
	const { getItemProps } = useListKeyboardNavigation(results.map(resultId), {
		onActivate: (id) => {
			const entry = results.find(e => resultId(e) === id);

			if (entry) {
				onNavigate(entry.section);
			}
		},
	});

	if (results.length === 0) {
		return <div className="search-empty">No settings found for "{searchTerm}".</div>;
	}

	return (
		<div className="search-results">
			{results.map((entry) => {
				const navProps = getItemProps(resultId(entry));

				return (
					<div
						key={resultId(entry)}
						role="button"
						className={navProps.selected ? 'search-result-item selected' : 'search-result-item'}
						tabIndex={navProps.tabIndex}
						ref={navProps.ref}
						onKeyDown={navProps.onKeyDown}
						onFocus={navProps.onFocus}
						onClick={() => onNavigate(entry.section)}
					>
						<div className="search-result-breadcrumb">{SECTION_TITLES[entry.section] ?? entry.section}</div>
						<div className="search-result-label">{getLabel(entry)}</div>
						<div className="search-result-description">{getDescription(entry)}</div>
					</div>
				);
			})}
		</div>
	);
}
