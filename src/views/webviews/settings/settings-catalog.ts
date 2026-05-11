// AUTO-GENERATED — do not edit by hand.
// Re-generate by running: node generate-settings.mjs

import type { NavSection } from './settings-metadata';

export interface CatalogEntry {
	section: NavSection;
	sectionLabel: string;
	label: string;
	description: string;
}

export const SETTINGS_CATALOG: CatalogEntry[] = [
	{ section: "connections", sectionLabel: "Connections", label: "SPARQL Connections", description: "List of SPARQL endpoint connections." },
	{ section: "query", sectionLabel: "Query", label: "Default Inference Enabled", description: "Default value for whether inferred triples should be included in SPARQL query results." },
	{ section: "query", sectionLabel: "Query", label: "List Graphs Query", description: "SPARQL query used to retrieve all named graphs and the default graph from a SPARQL endpoint." },
	{ section: "query", sectionLabel: "Query", label: "Drop Graph Query", description: "SPARQL query used to drop a named graph from a SPARQL endpoint." },
	{ section: "query", sectionLabel: "Query", label: "Describe Query Template", description: "SPARQL query template used by the describe command." },
	{ section: "query", sectionLabel: "Query", label: "Query Timeout", description: "Timeout in milliseconds for SPARQL query execution." },
	{ section: "appearance.definitions-tree", sectionLabel: "Definitions Tree", label: "Default Tree Label Style", description: "Set the standard style for rendering of tree labels." },
	{ section: "appearance.definitions-tree", sectionLabel: "Definitions Tree", label: "Default Definitions Tree Layout", description: "Set the standard style for rendering the definitions tree hierarchy." },
	{ section: "appearance.definitions-tree", sectionLabel: "Definitions Tree", label: "Default Language", description: "Set the default language tag to be used for rendering of labels and descriptions in the definitions tree." },
	{ section: "appearance.definitions-tree", sectionLabel: "Definitions Tree", label: "Decorate Missing Language Tags", description: "Grey out all terms in the definitions tree that do not have a value which is tagged in the currently selected language." },
	{ section: "appearance.display", sectionLabel: "Display", label: "Label Predicates", description: "Manage the predicates to be used for labels in the tree view for classes, properties and individuals." },
	{ section: "appearance.display", sectionLabel: "Display", label: "Description Predicates", description: "Manage the predicates to be used for descriptions in the tree view for classes, properties and individuals." },
	{ section: "editor.general", sectionLabel: "General", label: "Namespaces", description: "Manage the namespace URIs to be used in vocabularies." },
	{ section: "indexing", sectionLabel: "Indexing", label: "Use .gitignore", description: "If enabled, the .gitignore file will be used to exclude files and folders from the workspace index." },
	{ section: "indexing", sectionLabel: "Indexing", label: "Ignored Folders", description: "Manage the folders that should be skipped when indexing the workspace." },
	{ section: "indexing", sectionLabel: "Indexing", label: "Included Files", description: "Allows to manage a list of files as glob patterns that should be included in the workspace index even if they exceed the max file size limit." },
	{ section: "indexing", sectionLabel: "Indexing", label: "Max File Size", description: "Files above the specified size (bytes) will not be automatically be indexed at application startup to improve performance." },
	{ section: "editor.general", sectionLabel: "General", label: "Enable Code Lenses", description: "If enabled, the editor will show the number of total references and other metrics for each subject in a document." },
	{ section: "editor.general", sectionLabel: "General", label: "Query Parameter Name", description: "Name of the query parameter that is appended to URIs that already contain a fragment identifier (e.g. vscode-notebook-cell) when generating workspace: URIs." },
	{ section: "editor.general", sectionLabel: "General", label: "Auto Define Namespaces", description: "If enabled, the extension will automatically declare namespaces in the document header." },
	{ section: "editor.general", sectionLabel: "General", label: "Prefix Definition Mode", description: "Set the way prefixes are automatically defined in the document header." },
	{ section: "editor.sorting", sectionLabel: "Sorting", label: "Type Sorting Options", description: "Options for the priority-based sort strategy used when sorting documents by type." },
	{ section: "validation", sectionLabel: "Validation", label: "SHACL Validation Configuration", description: "Explicit SHACL shape configuration." },
	{ section: "validation", sectionLabel: "Validation", label: "Enable Experimental SHACL Validation Features", description: "If enabled, Mentor will show experimental SHACL validation features including the titlebar validate button and SHACL validation code lenses." },
	{ section: "editor.formatting", sectionLabel: "Formatting", label: "Turtle: Max Line Width", description: "Maximum line width before the Turtle formatter wraps long lines." },
	{ section: "editor.formatting", sectionLabel: "Formatting", label: "Turtle: Space Before Punctuation", description: "Insert a space before statement-ending punctuation characters (. ; ,) in Turtle documents." },
	{ section: "editor.formatting", sectionLabel: "Formatting", label: "Turtle: Blank Lines Between Subjects", description: "Insert a blank line between each top-level subject block in Turtle documents." },
	{ section: "editor.formatting", sectionLabel: "Formatting", label: "SPARQL: Uppercase Keywords", description: "Format SPARQL keywords (SELECT, WHERE, etc.) in uppercase." },
	{ section: "editor.formatting", sectionLabel: "Formatting", label: "SPARQL: Align Patterns", description: "Align triple patterns in the WHERE clause." },
	{ section: "editor.formatting", sectionLabel: "Formatting", label: "SPARQL: Opening Brace on Same Line", description: "Place opening braces on the same line as SPARQL keywords." },
	{ section: "editor.formatting", sectionLabel: "Formatting", label: "SPARQL: Separate Clauses", description: "Insert blank lines between major SPARQL clauses (SELECT, WHERE, etc.)." },
	{ section: "editor.formatting", sectionLabel: "Formatting", label: "SPARQL: Max Line Width", description: "Maximum line width before the SPARQL formatter wraps long lines." },
	{ section: "editor.formatting", sectionLabel: "Formatting", label: "SPARQL: Space Before Punctuation", description: "Insert a space before punctuation characters in SPARQL documents." },
	{ section: "validation", sectionLabel: "Validation", label: "Enable Linting", description: "If enabled, the extension will provide linting for RDF documents." },
	{ section: "validation", sectionLabel: "Validation", label: "Severity: Unresolved References", description: "The severity level for unresolved references in RDF documents." },
	{ section: "validation", sectionLabel: "Validation", label: "Severity: Unresolved Workspace Graphs", description: "The severity level for workspace: URI references that do not resolve to a known graph in the store." },
	{ section: "editor.templates", sectionLabel: "Templates", label: "Default SPARQL Document Template", description: "The default SPARQL document template to be used when creating a new SPARQL document." },
	{ section: "editor.templates", sectionLabel: "Templates", label: "Document Query Template", description: "The SPARQL query template used when creating a query for an RDF document." },
	{ section: "editor.templates", sectionLabel: "Templates", label: "Default Turtle Document Template", description: "The default Turtle document template to be used when creating a new Turtle document." },
	{ section: "editor.templates", sectionLabel: "Templates", label: "Default TriG Document Template", description: "The default TriG document template to be used when creating a new TriG document." },
	{ section: "editor.templates", sectionLabel: "Templates", label: "Default N3 Document Template", description: "The default N3 document template to be used when creating a new N3 document." },
	{ section: "editor.templates", sectionLabel: "Templates", label: "Default N-Triples Document Template", description: "The default N-Triples document template to be used when creating a new N-Triples document." },
	{ section: "editor.templates", sectionLabel: "Templates", label: "Default N-Quads Document Template", description: "The default N-Quads document template to be used when creating a new N-Quads document." },
	{ section: "editor.formatting", sectionLabel: "Formatting", label: "Format on save", description: "Automatically format documents on save." },
	{ section: "editor.formatting", sectionLabel: "Formatting", label: "Tab size", description: "Number of spaces per indent level used by the Mentor formatter." },
	{ section: "editor.formatting", sectionLabel: "Formatting", label: "Insert spaces", description: "Use spaces instead of tabs for indentation." },
	{ section: "editor.formatting", sectionLabel: "Formatting", label: "Word wrap", description: "Controls how lines wrap in the editor." },
];
