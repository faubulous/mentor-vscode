#!/usr/bin/env node
/**
 * Generates settings-metadata.ts from the contributes.configuration[0] block in package.json.
 *
 * Sources of truth in package.json:
 *   - x-nav-groups      : navigation hierarchy, group/section labels
 *   - x-catalog-extras  : CatalogExtra entries for VS Code built-in settings (no x-group)
 *   - properties        : all settings with type, enum, x-group, etc.
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

const allSections = navGroups.flatMap(g => g.sections);

// ── Collect settings entries ──────────────────────────────────

const entries = {};

for (const [fullKey, def] of Object.entries(properties)) {
	const section = def['x-group'];
	if (!section) continue;

	// Strip the "mentor." prefix
	const key = fullKey.replace(/^mentor\./, '');

	const entry = {
		section,
		experimental: def.experimental === true,
	};

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
const catalogExtras = config['x-catalog-extras'] ?? [];

const lines = [
	'// AUTO-GENERATED — do not edit by hand.',
	'// Re-generate by running: node generate-settings.mjs',
	'',
	"import type { EnumOption, NavGroupConfig, NavSectionConfig, CatalogExtra } from './settings-types';",
	'',
	'// ── Types ────────────────────────────────────────────────────',
	'',
	`export type NavSection =\n\t| ${navSectionType};`,
	'',
	'export interface SettingMeta {',
	'\tsection: NavSection;',
	'\texperimental?: boolean;',
	'\tenumOptions?: EnumOption[];',
	'\tnestedEnumOptions?: Record<string, EnumOption[]>;',
	'}',
	'',
	'// ── Data ─────────────────────────────────────────────────────',
	'',
	'export const SETTINGS: Record<string, SettingMeta> = {',
];

for (const [key, meta] of Object.entries(entries)) {
	lines.push(`\t${JSON.stringify(key)}: {`);
	lines.push(`\t\tsection: ${JSON.stringify(meta.section)},`);
	if (meta.experimental) {
		lines.push(`\t\texperimental: true,`);
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

// NAV_GROUPS first — SECTION_TITLES is derived from it below
lines.push('export const NAV_GROUPS: NavGroupConfig[] = ');
lines.push(JSON.stringify(navGroups, null, '\t') + ';');
lines.push('');

// SECTION_TITLES derived from NAV_GROUPS — no separate hardcoded object
lines.push('export const SECTION_TITLES = Object.fromEntries(');
lines.push('\tNAV_GROUPS.flatMap(g => g.sections.map((s: NavSectionConfig) => [s.id, s.label]))');
lines.push(') as Record<NavSection, string>;');
lines.push('');

// CATALOG_EXTRAS — only the 4 VS Code built-in extras; all Mentor settings are in SETTINGS
lines.push('export const CATALOG_EXTRAS: CatalogExtra[] = [');
for (const extra of catalogExtras) {
	lines.push(`\t{ section: ${JSON.stringify(extra.section)}, key: ${JSON.stringify(extra.key)}, label: ${JSON.stringify(extra.label)}, description: ${JSON.stringify(extra.description)} },`);
}
lines.push('];');
lines.push('');

// Helpers
lines.push('// ── Helpers ──────────────────────────────────────────────────');
lines.push('');
lines.push('/** Returns the enum options for a top-level setting key. */');
lines.push('export function getEnumOptions(key: string): EnumOption[] {');
lines.push('\treturn SETTINGS[key]?.enumOptions ?? [];');
lines.push('}');
lines.push('');
lines.push('/**');
lines.push(' * Returns the enum options for a nested property of an object setting.');
lines.push(' * @param key      The setting key (e.g. "sorting.typeSortingOptions")');
lines.push(' * @param propName The nested property name (e.g. "unmatchedPosition")');
lines.push(' */');
lines.push('export function getNestedEnumOptions(key: string, propName: string): EnumOption[] {');
lines.push('\treturn SETTINGS[key]?.nestedEnumOptions?.[propName] ?? [];');
lines.push('}');
lines.push('');

const output = lines.join('\n');
const outPath = join(__dirname, 'src/views/webviews/settings/settings-metadata.ts');
writeFileSync(outPath, output, 'utf8');
console.log(`Written ${Object.keys(entries).length} settings + ${catalogExtras.length} extras to ${outPath}`);
