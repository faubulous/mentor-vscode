// AUTO-GENERATED — do not edit by hand.
// Re-generate by running: node generate-settings.mjs

import type { CatalogExtra, EnumOption, SettingMetadata, SettingsNavigationGroupConfig, SettingsNavigationSectionConfig } from './settings-types';

// ── Types ────────────────────────────────────────────────────

export type SettingsNavigationSection =
	| "appearance.display"
	| "appearance.definitions-tree"
	| "editor.general"
	| "editor.templates"
	| "editor.formatting"
	| "editor.sorting"
	| "editor.validation"
	| "query.general"
	| "connections"
	| "indexing";

// ── Data ─────────────────────────────────────────────────────

export const SETTINGS: Record<string, SettingMetadata> = {
	"sparql.connections": {
		section: "connections",
		uiVisible: true,
	},
	"sparql.defaultInferenceEnabled": {
		section: "query.general",
		uiVisible: true,
	},
	"sparql.listGraphsQuery": {
		section: "query.general",
		uiVisible: true,
	},
	"sparql.dropGraphQuery": {
		section: "query.general",
		uiVisible: true,
	},
	"sparql.describeQueryTemplate": {
		section: "query.general",
		uiVisible: true,
	},
	"sparql.queryTimeout": {
		section: "query.general",
		uiVisible: true,
	},
	"definitionTree.labelStyle": {
		section: "appearance.definitions-tree",
		uiVisible: true,
		enumOptions: [{"value":"AnnotatedLabels","label":"Annotated Labels"},{"value":"UriLabels","label":"Uri Labels"},{"value":"UriLabelsWithPrefix","label":"Uri Labels With Prefix"}],
	},
	"definitionTree.defaultLayout": {
		section: "appearance.definitions-tree",
		uiVisible: true,
		enumOptions: [{"value":"GroupByType","label":"Group By Type"},{"value":"GroupBySource","label":"Group By Source"}],
	},
	"definitionTree.defaultLanguageTag": {
		section: "appearance.definitions-tree",
		uiVisible: true,
	},
	"definitionTree.decorateMissingLanguageTags": {
		section: "appearance.definitions-tree",
		uiVisible: true,
		enumOptions: [{"value":"Disabled","label":"Disabled"},{"value":"All","label":"All"},{"value":"Document","label":"Document"}],
	},
	"inference.enabled": {
		section: "query.general",
		uiVisible: false,
	},
	"predicates.label": {
		section: "appearance.display",
		uiVisible: true,
	},
	"predicates.description": {
		section: "appearance.display",
		uiVisible: true,
	},
	"namespaces": {
		section: "editor.general",
		uiVisible: true,
	},
	"index.useGitIgnore": {
		section: "indexing",
		uiVisible: true,
	},
	"index.ignoreFolders": {
		section: "indexing",
		uiVisible: true,
	},
	"index.includeFiles": {
		section: "indexing",
		uiVisible: true,
	},
	"index.maxFileSize": {
		section: "indexing",
		uiVisible: true,
	},
	"editor.codeLensEnabled": {
		section: "editor.general",
		uiVisible: true,
	},
	"prefixes.queryParameterName": {
		section: "editor.general",
		uiVisible: true,
	},
	"prefixes.autoDefinePrefixes": {
		section: "editor.general",
		uiVisible: true,
	},
	"prefixes.prefixDefinitionMode": {
		section: "editor.general",
		uiVisible: true,
		enumOptions: [{"value":"Append","label":"Append"},{"value":"Sorted","label":"Sorted"}],
	},
	"sorting.typeSortingOptions": {
		section: "editor.sorting",
		uiVisible: true,
		nestedEnumOptions: {"unmatchedPosition":[{"value":"start","label":"Start"},{"value":"end","label":"End"}],"unmatchedSort":[{"value":"alphabetical","label":"Alphabetical"},{"value":"none","label":"None"}]},
	},
	"shacl.validation": {
		section: "editor.validation",
		uiVisible: true,
	},
	"shacl.enabled": {
		section: "editor.validation",
		uiVisible: true,
		experimental: true,
	},
	"formatting.turtle.maxLineWidth": {
		section: "editor.formatting",
		uiVisible: true,
	},
	"formatting.turtle.spaceBeforePunctuation": {
		section: "editor.formatting",
		uiVisible: true,
	},
	"formatting.turtle.blankLinesBetweenSubjects": {
		section: "editor.formatting",
		uiVisible: true,
	},
	"formatting.sparql.uppercaseKeywords": {
		section: "editor.formatting",
		uiVisible: true,
	},
	"formatting.sparql.alignPatterns": {
		section: "editor.formatting",
		uiVisible: true,
	},
	"formatting.sparql.sameBraceLine": {
		section: "editor.formatting",
		uiVisible: true,
	},
	"formatting.sparql.separateClauses": {
		section: "editor.formatting",
		uiVisible: true,
	},
	"formatting.sparql.maxLineWidth": {
		section: "editor.formatting",
		uiVisible: true,
	},
	"formatting.sparql.spaceBeforePunctuation": {
		section: "editor.formatting",
		uiVisible: true,
	},
	"linting.enabled": {
		section: "editor.validation",
		uiVisible: true,
		experimental: true,
	},
	"linting.unresolvedReferenceSeverity": {
		section: "editor.validation",
		uiVisible: true,
		experimental: true,
		enumOptions: [{"value":"Error","label":"Error"},{"value":"Warning","label":"Warning"},{"value":"Information","label":"Information"},{"value":"Hint","label":"Hint"},{"value":"Disabled","label":"Disabled"}],
	},
	"linting.unresolvedWorkspaceGraphSeverity": {
		section: "editor.validation",
		uiVisible: true,
		experimental: true,
		enumOptions: [{"value":"Error","label":"Error"},{"value":"Warning","label":"Warning"},{"value":"Information","label":"Information"},{"value":"Hint","label":"Hint"},{"value":"Disabled","label":"Disabled"}],
	},
	"language.sparql.defaultDocumentTemplate": {
		section: "editor.templates",
		uiVisible: true,
	},
	"language.sparql.documentQueryTemplate": {
		section: "editor.templates",
		uiVisible: true,
	},
	"language.turtle.defaultDocumentTemplate": {
		section: "editor.templates",
		uiVisible: true,
	},
	"language.trig.defaultDocumentTemplate": {
		section: "editor.templates",
		uiVisible: true,
	},
	"language.n3.defaultDocumentTemplate": {
		section: "editor.templates",
		uiVisible: true,
	},
	"language.ntriples.defaultDocumentTemplate": {
		section: "editor.templates",
		uiVisible: true,
	},
	"language.nquads.defaultDocumentTemplate": {
		section: "editor.templates",
		uiVisible: true,
	},
};

export const SETTINGS_NAVIGATION_GROUPS: SettingsNavigationGroupConfig[] = 
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
				"id": "editor.templates",
				"label": "Templates"
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
				"id": "editor.validation",
				"label": "Validation"
			}
		]
	},
	{
		"id": "query",
		"label": "Query",
		"sections": [
			{
				"id": "query.general",
				"label": "General"
			},
			{
				"id": "connections",
				"label": "Connections"
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
	}
];

export const SECTION_TITLES = Object.fromEntries(
	SETTINGS_NAVIGATION_GROUPS.flatMap(g => g.sections.map((s: SettingsNavigationSectionConfig) => [s.id, s.label]))
) as Record<SettingsNavigationSection, string>;

export const CATALOG_EXTRAS: CatalogExtra[] = [
	{ section: "editor.formatting", key: "formatOnSave", label: "Format on save", description: "Automatically format documents on save." },
	{ section: "editor.formatting", key: "tabSize", label: "Tab size", description: "Number of spaces per indent level used by the Mentor formatter." },
	{ section: "editor.formatting", key: "insertSpaces", label: "Insert spaces", description: "Use spaces instead of tabs for indentation." },
	{ section: "editor.formatting", key: "wordWrap", label: "Word wrap", description: "Controls how lines wrap in the editor." },
];

export const VSCODE_SETTING_KEYS = CATALOG_EXTRAS.map(e => e.key);

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
