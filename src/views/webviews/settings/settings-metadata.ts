// AUTO-GENERATED — do not edit by hand.
// Re-generate by running: node generate-settings.mjs

// ── Types ────────────────────────────────────────────────────

export type NavSection =
	| "appearance.display"
	| "appearance.definitions-tree"
	| "editor.general"
	| "editor.formatting"
	| "editor.sorting"
	| "editor.templates"
	| "indexing"
	| "connections"
	| "query"
	| "validation";

export interface EnumOption {
	value: string;
	label: string;
}

export interface SettingMetadata {
	title: string;
	description: string;
	defaultValue: unknown;
	group: NavSection;
	experimental?: boolean;
	enumDescriptions?: string[];
	enumOptions?: EnumOption[];
	nestedEnumOptions?: Record<string, EnumOption[]>;
}

export interface NavSectionConfig {
	id: NavSection;
	label: string;
}

export interface NavGroupConfig {
	id: string;
	label: string;
	sections: NavSectionConfig[];
}

// ── Data ─────────────────────────────────────────────────────

export const SETTINGS_METADATA: Record<string, SettingMetadata> = {
	"sparql.connections": {
		title: "SPARQL Connections",
		description: "List of SPARQL endpoint connections.",
		defaultValue: [],
		group: "connections",
	},
	"sparql.defaultInferenceEnabled": {
		title: "Default Inference Enabled",
		description: "Default value for whether inferred triples should be included in SPARQL query results. This applies to connections that support inference toggling (e.g., the workspace store).",
		defaultValue: false,
		group: "query",
	},
	"sparql.listGraphsQuery": {
		title: "List Graphs Query",
		description: "SPARQL query used to retrieve all named graphs and the default graph from a SPARQL endpoint.",
		defaultValue: "SELECT DISTINCT ?graph\nWHERE \n{\n    GRAPH ?graph { ?s ?p ?o }\n}\nORDER BY ?graph",
		group: "query",
	},
	"sparql.dropGraphQuery": {
		title: "Drop Graph Query",
		description: "SPARQL query used to drop a named graph from a SPARQL endpoint.",
		defaultValue: "DROP GRAPH <@graphIri>",
		group: "query",
	},
	"sparql.describeQueryTemplate": {
		title: "Describe Query Template",
		description: "SPARQL query template used by the describe command. Use {{resourceIri}} for the selected resource and {{fromClauses}} for optional FROM clauses generated from graph URIs.",
		defaultValue: "CONSTRUCT { <{{resourceIri}}> ?p ?o }{{fromClauses}}\nWHERE { <{{resourceIri}}> ?p ?o }",
		group: "query",
	},
	"sparql.queryTimeout": {
		title: "Query Timeout",
		description: "Timeout in milliseconds for SPARQL query execution. Set to 0 for no timeout.",
		defaultValue: 30000,
		group: "query",
	},
	"definitionTree.labelStyle": {
		title: "Default Tree Label Style",
		description: "Set the standard style for rendering of tree labels.",
		defaultValue: "AnnotatedLabels",
		group: "appearance.definitions-tree",
		enumDescriptions: ["Render labels from the annotated label predicates.","Render the URI path element or fragment of the URI.","Render the URI path element or fragment with namespace prefix."],
		enumOptions: [{"value":"AnnotatedLabels","label":"Annotated Labels"},{"value":"UriLabels","label":"Uri Labels"},{"value":"UriLabelsWithPrefix","label":"Uri Labels With Prefix"}],
	},
	"definitionTree.defaultLayout": {
		title: "Default Definitions Tree Layout",
		description: "Set the standard style for rendering the definitions tree hierarchy.",
		defaultValue: "GroupBySource",
		group: "appearance.definitions-tree",
		enumDescriptions: ["Group all classes, properties and individuals in the definitions tree under common top level nodes for each type.","Group classes, properties and invdividuals in the definitions tree under seperate nodes for each ontology or concept scheme."],
		enumOptions: [{"value":"GroupByType","label":"Group By Type"},{"value":"GroupBySource","label":"Group By Source"}],
	},
	"definitionTree.defaultLanguageTag": {
		title: "Default Language",
		description: "Set the default language tag to be used for rendering of labels and descriptions in the definitions tree.",
		defaultValue: "en",
		group: "appearance.definitions-tree",
	},
	"definitionTree.decorateMissingLanguageTags": {
		title: "Decorate Missing Language Tags",
		description: "Grey out all terms in the definitions tree that do not have a value which is tagged in the currently selected language.",
		defaultValue: "Document",
		group: "appearance.definitions-tree",
		enumDescriptions: ["Disable the decoration of missing language tags.","Grey out missing language tags for definitions in all sources.","Grey out missing language tags only for definitions in the active document."],
		enumOptions: [{"value":"Disabled","label":"Disabled"},{"value":"All","label":"All"},{"value":"Document","label":"Document"}],
	},
	"predicates.label": {
		title: "Label Predicates",
		description: "Manage the predicates to be used for labels in the tree view for classes, properties and individuals. The first matching predicate will be used.",
		defaultValue: ["http://purl.org/dc/terms/title","http://purl.org/dc/elements/1.1/title","http://www.w3.org/2004/02/skos/core#prefLabel","http://www.w3.org/2000/01/rdf-schema#label","https://schema.org/name","http://schema.org/name","http://www.w3.org/ns/shacl#name","http://www.w3.org/ns/shacl#path"],
		group: "appearance.display",
	},
	"predicates.description": {
		title: "Description Predicates",
		description: "Manage the predicates to be used for descriptions in the tree view for classes, properties and individuals. The first matching predicate will be used.",
		defaultValue: ["http://www.w3.org/2004/02/skos/core#definition","http://www.w3.org/2000/01/rdf-schema#comment","http://purl.org/dc/terms/description","http://purl.org/dc/terms/abstract","https://schema.org/description","http://schema.org/description","http://www.w3.org/2004/02/skos/core#scopeNote"],
		group: "appearance.display",
	},
	"namespaces": {
		title: "Namespaces",
		description: "Manage the namespace URIs to be used in vocabularies.",
		defaultValue: [{"uri":"http://www.w3.org/1999/02/22-rdf-syntax-ns#","defaultPrefix":"rdf"},{"uri":"http://www.w3.org/2000/01/rdf-schema#","defaultPrefix":"rdfs"},{"uri":"http://www.w3.org/ns/rdfa#","defaultPrefix":"rdfa"},{"uri":"http://www.w3.org/2002/07/owl#","defaultPrefix":"owl"},{"uri":"http://www.w3.org/2004/02/skos/core#","defaultPrefix":"skos"},{"uri":"http://schema.org/","defaultPrefix":"schema"},{"uri":"https://schema.org/","defaultPrefix":"schema"}],
		group: "editor.general",
	},
	"index.useGitIgnore": {
		title: "Use .gitignore",
		description: "If enabled, the .gitignore file will be used to exclude files and folders from the workspace index.",
		defaultValue: true,
		group: "indexing",
	},
	"index.ignoreFolders": {
		title: "Ignored Folders",
		description: "Manage the folders that should be skipped when indexing the workspace.",
		defaultValue: [".vscode",".git","node_modules"],
		group: "indexing",
	},
	"index.includeFiles": {
		title: "Included Files",
		description: "Allows to manage a list of files as glob patterns that should be included in the workspace index even if they exceed the max file size limit.",
		defaultValue: [],
		group: "indexing",
	},
	"index.maxFileSize": {
		title: "Max File Size",
		description: "Files above the specified size (bytes) will not be automatically be indexed at application startup to improve performance. References and definitions in larger files will not be available in the text editors.",
		defaultValue: 1500000,
		group: "indexing",
	},
	"editor.codeLensEnabled": {
		title: "Enable Code Lenses",
		description: "If enabled, the editor will show the number of total references and other metrics for each subject in a document.",
		defaultValue: true,
		group: "editor.general",
	},
	"prefixes.queryParameterName": {
		title: "Query Parameter Name",
		description: "Name of the query parameter that is appended to URIs that already contain a fragment identifier (e.g. vscode-notebook-cell) when generating workspace: URIs.",
		defaultValue: "id",
		group: "editor.general",
	},
	"prefixes.autoDefinePrefixes": {
		title: "Auto Define Namespaces",
		description: "If enabled, the extension will automatically declare namespaces in the document header. The namespaces that are defined in workspace documents are used in preference over the ones retrieved from prefix.cc.",
		defaultValue: true,
		group: "editor.general",
	},
	"prefixes.prefixDefinitionMode": {
		title: "Prefix Definition Mode",
		description: "Set the way prefixes are automatically defined in the document header.",
		defaultValue: "Sorted",
		group: "editor.general",
		enumDescriptions: ["Append new prefixes to the end of the prefix definition list in the document header.","Maintain an alphabetical order of prefixes in the document header."],
		enumOptions: [{"value":"Append","label":"Append"},{"value":"Sorted","label":"Sorted"}],
	},
	"sorting.typeSortingOptions": {
		title: "Type Sorting Options",
		description: "Options for the priority-based sort strategy used when sorting documents by type. See the Mentor serializer [documentation](https://github.com/faubulous/mentor-rdf-serializers/blob/main/docs/sorting.md#priority) for reference.",
		defaultValue: {"typeOrder":["http://www.w3.org/2002/07/owl#Ontology","http://www.w3.org/2002/07/owl#Class","http://www.w3.org/2000/01/rdf-schema#Class","http://www.w3.org/2002/07/owl#ObjectProperty","http://www.w3.org/2002/07/owl#DatatypeProperty","http://www.w3.org/2002/07/owl#AnnotationProperty","http://www.w3.org/1999/02/22-rdf-syntax-ns#Property","http://www.w3.org/2002/07/owl#NamedIndividual","http://www.w3.org/2004/02/skos/core#ConceptScheme","http://www.w3.org/2004/02/skos/core#Collection","http://www.w3.org/2004/02/skos/core#Concept"],"predicateOrder":["http://www.w3.org/1999/02/22-rdf-syntax-ns#type"],"unmatchedPosition":"end","unmatchedSort":"alphabetical"},
		group: "editor.sorting",
		nestedEnumOptions: {"unmatchedPosition":[{"value":"start","label":"Start"},{"value":"end","label":"End"}],"unmatchedSort":[{"value":"alphabetical","label":"Alphabetical"},{"value":"none","label":"None"}]},
	},
	"shacl.validation": {
		title: "SHACL Validation Configuration",
		description: "Explicit SHACL shape configuration. Configure workspace defaults and per-graph include/exclude rules.",
		defaultValue: {"defaults":[],"graphs":{}},
		group: "validation",
	},
	"shacl.enabled": {
		title: "Enable Experimental SHACL Validation Features",
		description: "If enabled, Mentor will show experimental SHACL validation features including the titlebar validate button and SHACL validation code lenses.",
		defaultValue: false,
		group: "validation",
		experimental: true,
	},
	"formatting.turtle.maxLineWidth": {
		title: "Turtle: Max Line Width",
		description: "Maximum line width before the Turtle formatter wraps long lines. Set to 0 to disable wrapping.",
		defaultValue: 120,
		group: "editor.formatting",
	},
	"formatting.turtle.spaceBeforePunctuation": {
		title: "Turtle: Space Before Punctuation",
		description: "Insert a space before statement-ending punctuation characters (. ; ,) in Turtle documents.",
		defaultValue: true,
		group: "editor.formatting",
	},
	"formatting.turtle.blankLinesBetweenSubjects": {
		title: "Turtle: Blank Lines Between Subjects",
		description: "Insert a blank line between each top-level subject block in Turtle documents.",
		defaultValue: true,
		group: "editor.formatting",
	},
	"formatting.sparql.uppercaseKeywords": {
		title: "SPARQL: Uppercase Keywords",
		description: "Format SPARQL keywords (SELECT, WHERE, etc.) in uppercase.",
		defaultValue: true,
		group: "editor.formatting",
	},
	"formatting.sparql.alignPatterns": {
		title: "SPARQL: Align Patterns",
		description: "Align triple patterns in the WHERE clause.",
		defaultValue: true,
		group: "editor.formatting",
	},
	"formatting.sparql.sameBraceLine": {
		title: "SPARQL: Opening Brace on Same Line",
		description: "Place opening braces on the same line as SPARQL keywords.",
		defaultValue: true,
		group: "editor.formatting",
	},
	"formatting.sparql.separateClauses": {
		title: "SPARQL: Separate Clauses",
		description: "Insert blank lines between major SPARQL clauses (SELECT, WHERE, etc.).",
		defaultValue: true,
		group: "editor.formatting",
	},
	"formatting.sparql.maxLineWidth": {
		title: "SPARQL: Max Line Width",
		description: "Maximum line width before the SPARQL formatter wraps long lines. Set to 0 to disable wrapping.",
		defaultValue: 120,
		group: "editor.formatting",
	},
	"formatting.sparql.spaceBeforePunctuation": {
		title: "SPARQL: Space Before Punctuation",
		description: "Insert a space before punctuation characters in SPARQL documents.",
		defaultValue: true,
		group: "editor.formatting",
	},
	"linting.enabled": {
		title: "Enable Linting",
		description: "If enabled, the extension will provide linting for RDF documents.",
		defaultValue: false,
		group: "validation",
		experimental: true,
	},
	"linting.unresolvedReferenceSeverity": {
		title: "Severity: Unresolved References",
		description: "The severity level for unresolved references in RDF documents.",
		defaultValue: "Warning",
		group: "validation",
		experimental: true,
		enumDescriptions: ["Unresolved references will be treated as errors.","Unresolved references will be treated as warnings.","Unresolved references will be treated as information messages.","Unresolved references will be treated as hints.","Unresolved references will not be reported."],
		enumOptions: [{"value":"Error","label":"Error"},{"value":"Warning","label":"Warning"},{"value":"Information","label":"Information"},{"value":"Hint","label":"Hint"},{"value":"Disabled","label":"Disabled"}],
	},
	"linting.unresolvedWorkspaceGraphSeverity": {
		title: "Severity: Unresolved Workspace Graphs",
		description: "The severity level for workspace: URI references that do not resolve to a known graph in the store.",
		defaultValue: "Warning",
		group: "validation",
		experimental: true,
		enumDescriptions: ["Unresolved workspace graphs will be treated as errors.","Unresolved workspace graphs will be treated as warnings.","Unresolved workspace graphs will be treated as information messages.","Unresolved workspace graphs will be treated as hints.","Unresolved workspace graphs will not be reported."],
		enumOptions: [{"value":"Error","label":"Error"},{"value":"Warning","label":"Warning"},{"value":"Information","label":"Information"},{"value":"Hint","label":"Hint"},{"value":"Disabled","label":"Disabled"}],
	},
	"language.sparql.defaultDocumentTemplate": {
		title: "Default SPARQL Document Template",
		description: "The default SPARQL document template to be used when creating a new SPARQL document.",
		defaultValue: "SELECT ?s ?p ?o\nWHERE {\n\t?s ?p ?o\n}\nLIMIT 1000",
		group: "editor.templates",
	},
	"language.sparql.documentQueryTemplate": {
		title: "Document Query Template",
		description: "The SPARQL query template used when creating a query for an RDF document. Use {{documentUri}} as a placeholder for the document URI.",
		defaultValue: "SELECT ?s ?p ?o\nFROM <{{documentUri}}>\nWHERE {\n\t?s ?p ?o\n}\nLIMIT 1000",
		group: "editor.templates",
	},
	"language.turtle.defaultDocumentTemplate": {
		title: "Default Turtle Document Template",
		description: "The default Turtle document template to be used when creating a new Turtle document.",
		defaultValue: "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n@prefix owl: <http://www.w3.org/2002/07/owl#> .\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\n",
		group: "editor.templates",
	},
	"language.trig.defaultDocumentTemplate": {
		title: "Default TriG Document Template",
		description: "The default TriG document template to be used when creating a new TriG document.",
		defaultValue: "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n@prefix owl: <http://www.w3.org/2002/07/owl#> .\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\n",
		group: "editor.templates",
	},
	"language.n3.defaultDocumentTemplate": {
		title: "Default N3 Document Template",
		description: "The default N3 document template to be used when creating a new N3 document.",
		defaultValue: "@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .\n@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .\n@prefix owl: <http://www.w3.org/2002/07/owl#> .\n@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .\n\n",
		group: "editor.templates",
	},
	"language.ntriples.defaultDocumentTemplate": {
		title: "Default N-Triples Document Template",
		description: "The default N-Triples document template to be used when creating a new N-Triples document.",
		defaultValue: "",
		group: "editor.templates",
	},
	"language.nquads.defaultDocumentTemplate": {
		title: "Default N-Quads Document Template",
		description: "The default N-Quads document template to be used when creating a new N-Quads document.",
		defaultValue: "",
		group: "editor.templates",
	},
};

export const SECTION_TITLES: Record<NavSection, string> = {
	"appearance.display": "Display",
	"appearance.definitions-tree": "Definitions Tree",
	"editor.general": "General",
	"editor.formatting": "Formatting",
	"editor.sorting": "Sorting",
	"editor.templates": "Templates",
	"indexing": "Indexing",
	"connections": "Connections",
	"query": "Query",
	"validation": "Validation",
};

export const NAV_GROUPS: NavGroupConfig[] = 
[
	{
		"id": "appearance",
		"label": "Appearance",
		"sections": [
			{
				"id": "appearance.display",
				"label": "Display"
			},
			{
				"id": "appearance.definitions-tree",
				"label": "Definitions Tree"
			}
		]
	},
	{
		"id": "editor",
		"label": "Editor",
		"sections": [
			{
				"id": "editor.general",
				"label": "General"
			},
			{
				"id": "editor.formatting",
				"label": "Formatting"
			},
			{
				"id": "editor.sorting",
				"label": "Sorting"
			},
			{
				"id": "editor.templates",
				"label": "Templates"
			}
		]
	},
	{
		"id": "indexing",
		"label": "Indexing",
		"sections": [
			{
				"id": "indexing",
				"label": "Indexing"
			}
		]
	},
	{
		"id": "connections",
		"label": "Connections",
		"sections": [
			{
				"id": "connections",
				"label": "Connections"
			}
		]
	},
	{
		"id": "query",
		"label": "Query",
		"sections": [
			{
				"id": "query",
				"label": "Query"
			}
		]
	},
	{
		"id": "validation",
		"label": "Validation",
		"sections": [
			{
				"id": "validation",
				"label": "Validation"
			}
		]
	}
];

// ── Helpers ──────────────────────────────────────────────────

/** Returns the enum options for a top-level setting key. */
export function getEnumOptions(key: string): EnumOption[] {
	return SETTINGS_METADATA[key]?.enumOptions ?? [];
}

/**
 * Returns the enum options for a nested property of an object setting.
 * @param key     The setting key (e.g. "sorting.typeSortingOptions")
 * @param propName The nested property name (e.g. "unmatchedPosition")
 */
export function getNestedEnumOptions(key: string, propName: string): EnumOption[] {
	return SETTINGS_METADATA[key]?.nestedEnumOptions?.[propName] ?? [];
}
