import { NavSection } from './settings-nav';

export interface CatalogEntry {
	section: NavSection;
	sectionLabel: string;
	label: string;
	description: string;
}

export const SETTINGS_CATALOG: CatalogEntry[] = [
	{ section: 'appearance.display', sectionLabel: 'Display', label: 'Label predicates', description: 'RDF predicate URIs used to display labels for resources.' },
	{ section: 'appearance.display', sectionLabel: 'Display', label: 'Description predicates', description: 'RDF predicate URIs used to display descriptions for resources.' },
	{ section: 'appearance.definitions-tree', sectionLabel: 'Definitions Tree', label: 'Label style', description: 'How labels are displayed in the definitions tree.' },
	{ section: 'appearance.definitions-tree', sectionLabel: 'Definitions Tree', label: 'Default layout', description: 'How to group resources in the definitions tree.' },
	{ section: 'appearance.definitions-tree', sectionLabel: 'Definitions Tree', label: 'Default language tag', description: 'Filter labels and descriptions by language tag (e.g. en, de).' },
	{ section: 'appearance.definitions-tree', sectionLabel: 'Definitions Tree', label: 'Decorate missing language tags', description: 'Highlight resources missing a label in the default language.' },
	{ section: 'editor.general', sectionLabel: 'Editor', label: 'Enable code lens', description: 'Show code lens actions above class definitions and property declarations.' },
	{ section: 'editor.general', sectionLabel: 'Editor', label: 'Auto-define prefixes', description: 'Automatically declare namespace prefixes in the document header.' },
	{ section: 'editor.general', sectionLabel: 'Editor', label: 'Prefix definition mode', description: 'Controls where new prefix declarations are inserted in the document.' },
	{ section: 'editor.general', sectionLabel: 'Editor', label: 'Workspace URI query parameter', description: 'Name of the query parameter appended to workspace: URIs.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Format on save', description: 'Automatically format documents on save.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Tab size', description: 'Number of spaces per indent level used by the Mentor formatter.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Insert spaces', description: 'Use spaces instead of tabs for indentation.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Word wrap', description: 'Controls how lines wrap in the editor.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Max line width', description: 'Maximum line width before the formatter wraps long lines.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Space before punctuation', description: 'Insert a space before punctuation characters.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Blank lines between subjects', description: 'Insert a blank line between each top-level subject block (Turtle).' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Uppercase keywords', description: 'Format SPARQL keywords (SELECT, WHERE, etc.) in uppercase.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Align patterns', description: 'Align triple patterns in the WHERE clause (SPARQL).' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Opening brace on same line', description: 'Place opening braces on the same line as SPARQL keywords.' },
	{ section: 'editor.formatting', sectionLabel: 'Formatting', label: 'Separate clauses', description: 'Insert blank lines between major SPARQL clauses.' },
	{ section: 'editor.sorting', sectionLabel: 'Sorting', label: 'Type order', description: 'RDF type IRIs in priority order for sorting documents by type.' },
	{ section: 'editor.sorting', sectionLabel: 'Sorting', label: 'Predicate order', description: 'Predicate IRIs for secondary sorting within each type group.' },
	{ section: 'editor.sorting', sectionLabel: 'Sorting', label: 'Unmatched resource position', description: 'Where to place resources not matching any type in the order list.' },
	{ section: 'editor.sorting', sectionLabel: 'Sorting', label: 'Unmatched resource sort', description: 'How to sort resources not matching any type in the order list.' },
	{ section: 'editor.templates', sectionLabel: 'Templates', label: 'SPARQL document template', description: 'Default content for new SPARQL documents.' },
	{ section: 'editor.templates', sectionLabel: 'Templates', label: 'SPARQL query (from document) template', description: 'Template used when opening a query from a document.' },
	{ section: 'editor.templates', sectionLabel: 'Templates', label: 'Turtle document template', description: 'Default content for new Turtle documents.' },
	{ section: 'editor.templates', sectionLabel: 'Templates', label: 'TriG document template', description: 'Default content for new TriG documents.' },
	{ section: 'editor.templates', sectionLabel: 'Templates', label: 'N3 document template', description: 'Default content for new N3 documents.' },
	{ section: 'editor.templates', sectionLabel: 'Templates', label: 'N-Triples document template', description: 'Default content for new N-Triples documents.' },
	{ section: 'editor.templates', sectionLabel: 'Templates', label: 'N-Quads document template', description: 'Default content for new N-Quads documents.' },
	{ section: 'indexing', sectionLabel: 'Indexing', label: 'Max file size', description: 'Maximum file size in bytes to index. Larger files are skipped.' },
	{ section: 'indexing', sectionLabel: 'Indexing', label: 'Use .gitignore', description: 'Exclude files matched by .gitignore patterns from the workspace index.' },
	{ section: 'indexing', sectionLabel: 'Indexing', label: 'Ignore folders', description: 'Glob patterns for folders to exclude from the workspace index.' },
	{ section: 'indexing', sectionLabel: 'Indexing', label: 'Include files', description: 'Glob patterns for files to force-include in the workspace index.' },
	{ section: 'connections', sectionLabel: 'Connections', label: 'SPARQL connections', description: 'Manage SPARQL endpoint connections for querying.' },
	{ section: 'query', sectionLabel: 'Query', label: 'Default inference enabled', description: 'Enable inference by default for new SPARQL connections.' },
	{ section: 'query', sectionLabel: 'Query', label: 'Query timeout', description: 'Timeout in milliseconds for SPARQL query execution.' },
	{ section: 'query', sectionLabel: 'Query', label: 'List graphs query', description: 'SPARQL query template used to list named graphs in an endpoint.' },
	{ section: 'query', sectionLabel: 'Query', label: 'Drop graph query', description: 'SPARQL query template used to drop a named graph from an endpoint.' },
	{ section: 'query', sectionLabel: 'Query', label: 'Describe query template', description: 'SPARQL DESCRIBE query template. Use {{uri}} as the resource placeholder.' },
	{ section: 'editor.general', sectionLabel: 'General', label: 'Namespace prefixes', description: 'Custom namespace URI and prefix pairs for completion and auto-definition.' },
	{ section: 'validation', sectionLabel: 'Validation', label: 'Enable SHACL validation', description: 'Validate RDF documents against SHACL shapes (experimental).' },
	{ section: 'validation', sectionLabel: 'Validation', label: 'Default shapes', description: 'Shape graph URIs applied by default to all graphs without per-graph settings.' },
	{ section: 'validation', sectionLabel: 'Validation', label: 'Per-graph configuration', description: 'SHACL shape configurations for specific named graphs.' }
];

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
