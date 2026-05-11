#!/usr/bin/env node
/**
 * Generates two files from the contributes.configuration[0] block in package.json:
 *   - src/views/webviews/settings/settings-metadata.ts  (types, metadata, nav structure)
 *   - src/views/webviews/settings/settings-catalog.ts   (search catalog for the settings UI)
 *
 * Sources of truth in package.json:
 *   - x-nav-groups      : navigation hierarchy, group/section labels
 *   - x-catalog-extras  : catalog entries for VS Code built-in settings (no x-group)
 *   - properties        : all settings with type, enum, enumDescriptions, x-group, etc.
 *
 * Run: node generate-settings.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
const config = pkg.contributes.configuration[0];
const properties = config.properties;
const navGroups = config['x-nav-groups'];

if (!navGroups) {
	console.error('ERROR: x-nav-groups not found in contributes.configuration[0]');
	process.exit(1);
}

// ── Helpers ───────────────────────────────────────────────────

/**
 * Splits a PascalCase or camelCase identifier into a human-readable label.
 * "AnnotatedLabels" → "Annotated Labels"
 * "GroupByType"     → "Group By Type"
 * "unmatchedSort"   → "Unmatched Sort"
 */
function splitLabel(str) {
	return str
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')   // handle sequences like "HTMLParser" → "HTML Parser"
		.replace(/([a-z\d])([A-Z])/g, '$1 $2')         // insert space before each capital
		.replace(/_/g, ' ')                             // underscores → spaces
		.replace(/^./, c => c.toUpperCase())            // capitalise first char
		.trim();
}

/**
 * Extract enum options as {value, label} pairs from an enum array.
 */
function toEnumOptions(enumValues) {
	return enumValues.map(v => ({ value: String(v), label: splitLabel(String(v)) }));
}

// ── Collect nav sections flat list ────────────────────────────

const allSections = [];
for (const group of navGroups) {
	for (const section of group.sections) {
		allSections.push(section);
	}
}

// Build SECTION_TITLES from x-nav-groups
const sectionTitles = {};
for (const section of allSections) {
	sectionTitles[section.id] = section.label;
}

// ── Collect settings entries ──────────────────────────────────

const entries = {};

for (const [fullKey, def] of Object.entries(properties)) {
	const group = def['x-group'];
	if (!group) continue;

	// Strip the "mentor." prefix
	const key = fullKey.replace(/^mentor\./, '');

	const entry = {
		title: def.title ?? key,
		description: def.description ?? '',
		defaultValue: def.default ?? null,
		group,
		experimental: def.experimental === true,
	};

	if (def.enumDescriptions) {
		entry.enumDescriptions = def.enumDescriptions;
	}

	// Top-level enum
	if (Array.isArray(def.enum)) {
		entry.enumOptions = toEnumOptions(def.enum);
	}

	// Nested enums from object property sub-schemas
	if (def.type === 'object' && def.properties) {
		const nested = {};
		for (const [propName, propDef] of Object.entries(def.properties)) {
			if (Array.isArray(propDef.enum)) {
				nested[propName] = toEnumOptions(propDef.enum);
			}
		}
		if (Object.keys(nested).length > 0) {
			entry.nestedEnumOptions = nested;
		}
	}

	entries[key] = entry;
}

// ── Build TypeScript source ───────────────────────────────────

const navSectionType = allSections.map(s => JSON.stringify(s.id)).join('\n\t| ');

const lines = [
	'// AUTO-GENERATED — do not edit by hand.',
	'// Re-generate by running: node generate-settings.mjs',
	'',
	'// ── Types ────────────────────────────────────────────────────',
	'',
	`export type NavSection =\n\t| ${navSectionType};`,
	'',
	'export interface EnumOption {',
	'\tvalue: string;',
	'\tlabel: string;',
	'}',
	'',
	'export interface SettingMetadata {',
	'\ttitle: string;',
	'\tdescription: string;',
	'\tdefaultValue: unknown;',
	'\tgroup: NavSection;',
	'\texperimental?: boolean;',
	'\tenumDescriptions?: string[];',
	'\tenumOptions?: EnumOption[];',
	'\tnestedEnumOptions?: Record<string, EnumOption[]>;',
	'}',
	'',
	'export interface NavSectionConfig {',
	'\tid: NavSection;',
	'\tlabel: string;',
	'}',
	'',
	'export interface NavGroupConfig {',
	'\tid: string;',
	'\tlabel: string;',
	'\tsections: NavSectionConfig[];',
	'}',
	'',
	'// ── Data ─────────────────────────────────────────────────────',
	'',
	'export const SETTINGS_METADATA: Record<string, SettingMetadata> = {',
];

for (const [key, meta] of Object.entries(entries)) {
	lines.push(`\t${JSON.stringify(key)}: {`);
	lines.push(`\t\ttitle: ${JSON.stringify(meta.title)},`);
	lines.push(`\t\tdescription: ${JSON.stringify(meta.description)},`);
	lines.push(`\t\tdefaultValue: ${JSON.stringify(meta.defaultValue)},`);
	lines.push(`\t\tgroup: ${JSON.stringify(meta.group)},`);
	if (meta.experimental) {
		lines.push(`\t\texperimental: true,`);
	}
	if (meta.enumDescriptions) {
		lines.push(`\t\tenumDescriptions: ${JSON.stringify(meta.enumDescriptions)},`);
	}
	if (meta.enumOptions) {
		lines.push(`\t\tenumOptions: ${JSON.stringify(meta.enumOptions)},`);
	}
	if (meta.nestedEnumOptions) {
		lines.push(`\t\tnestedEnumOptions: ${JSON.stringify(meta.nestedEnumOptions)},`);
	}
	lines.push('\t},');
}

lines.push('};');
lines.push('');

// SECTION_TITLES
lines.push('export const SECTION_TITLES: Record<NavSection, string> = {');
for (const [id, label] of Object.entries(sectionTitles)) {
	lines.push(`\t${JSON.stringify(id)}: ${JSON.stringify(label)},`);
}
lines.push('};');
lines.push('');

// NAV_GROUPS
lines.push('export const NAV_GROUPS: NavGroupConfig[] = ');
lines.push(JSON.stringify(navGroups, null, '\t').replace(/\n/g, '\n') + ';');
lines.push('');

// getEnumOptions helper
lines.push('// ── Helpers ──────────────────────────────────────────────────');
lines.push('');
lines.push('/** Returns the enum options for a top-level setting key. */');
lines.push('export function getEnumOptions(key: string): EnumOption[] {');
lines.push('\treturn SETTINGS_METADATA[key]?.enumOptions ?? [];');
lines.push('}');
lines.push('');
lines.push('/**');
lines.push(' * Returns the enum options for a nested property of an object setting.');
lines.push(' * @param key     The setting key (e.g. "sorting.typeSortingOptions")');
lines.push(' * @param propName The nested property name (e.g. "unmatchedPosition")');
lines.push(' */');
lines.push('export function getNestedEnumOptions(key: string, propName: string): EnumOption[] {');
lines.push('\treturn SETTINGS_METADATA[key]?.nestedEnumOptions?.[propName] ?? [];');
lines.push('}');
lines.push('');

const output = lines.join('\n');
const outPath = join(__dirname, 'src/views/webviews/settings/settings-metadata.ts');
writeFileSync(outPath, output, 'utf8');
console.log(`Written ${Object.keys(entries).length} settings to ${outPath}`);

// ── Generate settings-catalog.ts ─────────────────────────────

const catalogExtras = config['x-catalog-extras'] ?? [];

/**
 * Returns only the first sentence of a description string.
 * Splits at a period followed by whitespace + an uppercase letter, so
 * abbreviations like "e.g. foo" or ".gitignore" are not split incorrectly.
 */
function firstSentence(str) {
	const m = str.match(/^(.*?\.)(?:\s+[A-Z]|$)/s);
	return m ? m[1].trim() : str.trim();
}

const catalogLines = [
	'// AUTO-GENERATED — do not edit by hand.',
	'// Re-generate by running: node generate-settings.mjs',
	'',
	"import type { NavSection } from './settings-metadata';",
	'',
	'export interface CatalogEntry {',
	'\tsection: NavSection;',
	'\tsectionLabel: string;',
	'\tlabel: string;',
	'\tdescription: string;',
	'}',
	'',
	'export const SETTINGS_CATALOG: CatalogEntry[] = [',
];

for (const [, meta] of Object.entries(entries)) {
	const sectionLabel = sectionTitles[meta.group] ?? meta.group;
	const label = meta.title;
	const description = firstSentence(meta.description);
	catalogLines.push(`\t{ section: ${JSON.stringify(meta.group)}, sectionLabel: ${JSON.stringify(sectionLabel)}, label: ${JSON.stringify(label)}, description: ${JSON.stringify(description)} },`);
}

for (const extra of catalogExtras) {
	const sectionLabel = sectionTitles[extra.section] ?? extra.section;
	catalogLines.push(`\t{ section: ${JSON.stringify(extra.section)}, sectionLabel: ${JSON.stringify(sectionLabel)}, label: ${JSON.stringify(extra.label)}, description: ${JSON.stringify(extra.description)} },`);
}

catalogLines.push('];');
catalogLines.push('');

const catalogOutput = catalogLines.join('\n');
const catalogPath = join(__dirname, 'src/views/webviews/settings/settings-catalog.ts');
writeFileSync(catalogPath, catalogOutput, 'utf8');
console.log(`Written ${Object.keys(entries).length + catalogExtras.length} catalog entries to ${catalogPath}`);
