// AUTO-GENERATED — do not edit by hand.
// Re-generate by running: node generate-settings.mjs

import type { EnumOption, NavGroupConfig, NavSectionConfig, CatalogExtra } from './settings-types';

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

export interface SettingMeta {
	section: NavSection;
	experimental?: boolean;
	enumOptions?: EnumOption[];
	nestedEnumOptions?: Record<string, EnumOption[]>;
}

// ── Data ─────────────────────────────────────────────────────

export const SETTINGS: Record<string, SettingMeta> = {
	"sparql.connections": {
		section: "connections",
	},
	"sparql.defaultInferenceEnabled": {
		section: "query",
	},
	"sparql.listGraphsQuery": {
		section: "query",
	},
	"sparql.dropGraphQuery": {
		section: "query",
	},
	"sparql.describeQueryTemplate": {
		section: "query",
	},
	"sparql.queryTimeout": {
		section: "query",
	},
	"definitionTree.labelStyle": {
		section: "appearance.definitions-tree",
		enumOptions: [{ "value": "AnnotatedLabels", "label": "Annotated Labels" }, { "value": "UriLabels", "label": "Uri Labels" }, { "value": "UriLabelsWithPrefix", "label": "Uri Labels With Prefix" }],
	},
	"definitionTree.defaultLayout": {
		section: "appearance.definitions-tree",
		enumOptions: [{ "value": "GroupByType", "label": "Group By Type" }, { "value": "GroupBySource", "label": "Group By Source" }],
	},
	"definitionTree.defaultLanguageTag": {
		section: "appearance.definitions-tree",
	},
	"definitionTree.decorateMissingLanguageTags": {
		section: "appearance.definitions-tree",
		enumOptions: [{ "value": "Disabled", "label": "Disabled" }, { "value": "All", "label": "All" }, { "value": "Document", "label": "Document" }],
	},
	"predicates.label": {
		section: "appearance.display",
	},
	"predicates.description": {
		section: "appearance.display",
	},
	"namespaces": {
		section: "editor.general",
	},
	"index.useGitIgnore": {
		section: "indexing",
	},
	"index.ignoreFolders": {
		section: "indexing",
	},
	"index.includeFiles": {
		section: "indexing",
	},
	"index.maxFileSize": {
		section: "indexing",
	},
	"editor.codeLensEnabled": {
		section: "editor.general",
	},
	"prefixes.queryParameterName": {
		section: "editor.general",
	},
	"prefixes.autoDefinePrefixes": {
		section: "editor.general",
	},
	"prefixes.prefixDefinitionMode": {
		section: "editor.general",
		enumOptions: [{ "value": "Append", "label": "Append" }, { "value": "Sorted", "label": "Sorted" }],
	},
	"sorting.typeSortingOptions": {
		section: "editor.sorting",
		nestedEnumOptions: { "unmatchedPosition": [{ "value": "start", "label": "Start" }, { "value": "end", "label": "End" }], "unmatchedSort": [{ "value": "alphabetical", "label": "Alphabetical" }, { "value": "none", "label": "None" }] },
	},
	"shacl.validation": {
		section: "validation",
	},
	"shacl.enabled": {
		section: "validation",
		experimental: true,
	},
	"formatting.turtle.maxLineWidth": {
		section: "editor.formatting",
	},
	"formatting.turtle.spaceBeforePunctuation": {
		section: "editor.formatting",
	},
	"formatting.turtle.blankLinesBetweenSubjects": {
		section: "editor.formatting",
	},
	"formatting.sparql.uppercaseKeywords": {
		section: "editor.formatting",
	},
	"formatting.sparql.alignPatterns": {
		section: "editor.formatting",
	},
	"formatting.sparql.sameBraceLine": {
		section: "editor.formatting",
	},
	"formatting.sparql.separateClauses": {
		section: "editor.formatting",
	},
	"formatting.sparql.maxLineWidth": {
		section: "editor.formatting",
	},
	"formatting.sparql.spaceBeforePunctuation": {
		section: "editor.formatting",
	},
	"linting.enabled": {
		section: "validation",
		experimental: true,
	},
	"linting.unresolvedReferenceSeverity": {
		section: "validation",
		experimental: true,
		enumOptions: [{ "value": "Error", "label": "Error" }, { "value": "Warning", "label": "Warning" }, { "value": "Information", "label": "Information" }, { "value": "Hint", "label": "Hint" }, { "value": "Disabled", "label": "Disabled" }],
	},
	"linting.unresolvedWorkspaceGraphSeverity": {
		section: "validation",
		experimental: true,
		enumOptions: [{ "value": "Error", "label": "Error" }, { "value": "Warning", "label": "Warning" }, { "value": "Information", "label": "Information" }, { "value": "Hint", "label": "Hint" }, { "value": "Disabled", "label": "Disabled" }],
	},
	"language.sparql.defaultDocumentTemplate": {
		section: "editor.templates",
	},
	"language.sparql.documentQueryTemplate": {
		section: "editor.templates",
	},
	"language.turtle.defaultDocumentTemplate": {
		section: "editor.templates",
	},
	"language.trig.defaultDocumentTemplate": {
		section: "editor.templates",
	},
	"language.n3.defaultDocumentTemplate": {
		section: "editor.templates",
	},
	"language.ntriples.defaultDocumentTemplate": {
		section: "editor.templates",
	},
	"language.nquads.defaultDocumentTemplate": {
		section: "editor.templates",
	},
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

export const SECTION_TITLES = Object.fromEntries(
	NAV_GROUPS.flatMap(g => g.sections.map((s: NavSectionConfig) => [s.id, s.label]))
) as Record<NavSection, string>;

export const CATALOG_EXTRAS: CatalogExtra[] = [
	{ section: "editor.formatting", key: "formatOnSave", label: "Format on save", description: "Automatically format documents on save." },
	{ section: "editor.formatting", key: "tabSize", label: "Tab size", description: "Number of spaces per indent level used by the Mentor formatter." },
	{ section: "editor.formatting", key: "insertSpaces", label: "Insert spaces", description: "Use spaces instead of tabs for indentation." },
	{ section: "editor.formatting", key: "wordWrap", label: "Word wrap", description: "Controls how lines wrap in the editor." },
];

// ── Helpers ──────────────────────────────────────────────────

/** Returns the enum options for a top-level setting key. */
export function getEnumOptions(key: string): EnumOption[] {
	return SETTINGS[key]?.enumOptions ?? [];
}

/**
 * Returns the enum options for a nested property of an object setting.
 * @param key      The setting key (e.g. "sorting.typeSortingOptions")
 * @param propName The nested property name (e.g. "unmatchedPosition")
 */
export function getNestedEnumOptions(key: string, propName: string): EnumOption[] {
	return SETTINGS[key]?.nestedEnumOptions?.[propName] ?? [];
}
