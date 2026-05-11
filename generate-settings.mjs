#!/usr/bin/env node
/**
 * Generates src/views/webviews/settings/settings-metadata.ts from
 * the contributes.configuration[0].properties block in package.json.
 *
 * Only properties that carry an "x-group" annotation are emitted.
 * Run: node generate-settings.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'));
const properties = pkg.contributes.configuration[0].properties;

/** Human-readable titles for each NavSection, used in SECTION_TITLES. */
const SECTION_TITLES = {
	'appearance.display': 'Display',
	'appearance.definitions-tree': 'Definitions Tree',
	'editor.general': 'General',
	'editor.formatting': 'Formatting',
	'editor.sorting': 'Sorting',
	'editor.templates': 'Templates',
	'indexing': 'Indexing',
	'connections': 'Connections',
	'query': 'Query',
	'validation': 'Validation',
};

const entries = {};

for (const [fullKey, def] of Object.entries(properties)) {
	const group = def['x-group'];
	if (!group) continue;

	// Strip the "mentor." prefix
	const key = fullKey.replace(/^mentor\./, '');

	entries[key] = {
		title: def.title ?? key,
		description: def.description ?? '',
		defaultValue: def.default ?? null,
		group,
		...(def.enumDescriptions ? { enumDescriptions: def.enumDescriptions } : {}),
	};
}

// Build the TypeScript source
const lines = [
	'// AUTO-GENERATED — do not edit by hand.',
	'// Re-generate by running: node generate-settings.mjs',
	'',
	"import type { NavSection } from './components/settings-nav';",
	'',
	'export interface SettingMetadata {',
	'\ttitle: string;',
	'\tdescription: string;',
	'\tdefaultValue: unknown;',
	'\tgroup: NavSection;',
	'\tenumDescriptions?: string[];',
	'}',
	'',
	'export const SETTINGS_METADATA: Record<string, SettingMetadata> = {',
];

for (const [key, meta] of Object.entries(entries)) {
	lines.push(`\t${JSON.stringify(key)}: {`);
	lines.push(`\t\ttitle: ${JSON.stringify(meta.title)},`);
	lines.push(`\t\tdescription: ${JSON.stringify(meta.description)},`);
	lines.push(`\t\tdefaultValue: ${JSON.stringify(meta.defaultValue)},`);
	lines.push(`\t\tgroup: ${JSON.stringify(meta.group)},`);
	if (meta.enumDescriptions) {
		lines.push(`\t\tenumDescriptions: ${JSON.stringify(meta.enumDescriptions)},`);
	}
	lines.push('\t},');
}

lines.push('};');
lines.push('');
lines.push('export const SECTION_TITLES: Record<NavSection, string> = {');
for (const [group, title] of Object.entries(SECTION_TITLES)) {
	lines.push(`\t${JSON.stringify(group)}: ${JSON.stringify(title)},`);
}
lines.push('};');
lines.push('');

const output = lines.join('\n');
const outPath = join(__dirname, 'src/views/webviews/settings/settings-metadata.ts');
writeFileSync(outPath, output, 'utf8');
console.log(`Written ${Object.keys(entries).length} settings to ${outPath}`);
