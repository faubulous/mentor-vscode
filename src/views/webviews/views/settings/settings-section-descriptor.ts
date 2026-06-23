import type { ComponentType } from 'react';

/**
 * A VS Code built-in setting that a Mentor settings section surfaces in its UI
 * (e.g. `editor.formatOnSave` shown alongside the Turtle/SPARQL formatting options).
 *
 * Replaces the former `x-catalog-extras` block in `package.json`.
 */
export interface VSCodeBuiltinKey {
	/**
	 * Bare VS Code key without the `editor.` prefix, e.g. `"formatOnSave"`.
	 */
	readonly key: string;

	/**
	 * Label and description for the setting, used in the UI and tooltips.
	 * @note Should be copied from VS Code's own documentation to avoid confusion.
	 */
	readonly label: string;

	/**
	 * Description for the setting, used in tooltips.
	 * @note Should be copied from VS Code's own documentation to avoid confusion.
	 */
	readonly description: string;
}

/**
 * Self-contained declaration of a single settings panel section. Every section
 * file exports one of these constants alongside its React component; the
 * `sections/` index aggregates them into the navigation tree, the section
 * registry, the search index, and the VS Code key list.
 *
 * `package.json` remains the source of truth for type/default/description/enum
 * of each `mentor.*` key; this descriptor only owns the navigation and
 * registration plumbing that used to live in the generated metadata module.
 */
export interface SettingsSectionDescriptor {
	/**
	 * Stable id used in messages, deep links, and nav state, e.g. `"appearance.display"`.
	 */
	readonly id: string;

	/**
	 * Label rendered in the sidebar, e.g. `"Display"`.
	 */
	readonly label: string;

	/**
	 * React component rendered when this section is active.
	 */
	readonly component: ComponentType<any>;

	/**
	 * Mentor keys (without the `mentor.` prefix) this section renders.
	 */
	readonly keys: readonly string[];

	/**
	 * Mentor keys claimed by this section but not rendered (replaces `x-settings-visible: false`).
	 */
	readonly hiddenKeys?: readonly string[];

	/**
	 * VS Code built-in keys this section surfaces (replaces `x-catalog-extras`).
	 */
	readonly vscodeKeys?: readonly VSCodeBuiltinKey[];
}

/**
 * Development time check that the section descriptors stay in sync with `package.json`.
 *
 * - Every `mentor.*` key declared in `package.json` must be claimed by exactly one
 *   section (in either `keys` or `hiddenKeys`).
 * - Every key listed by a section must exist as a `mentor.*` property in `package.json`.
 *
 * Replaces the hard-failure path of the old `generate-settings.mjs` generator.
 */
export function validateSectionDescriptors(
	sections: readonly SettingsSectionDescriptor[],
	packageProperties: Record<string, unknown>,
): string[] {
	const errors: string[] = [];
	const claimed = new Map<string, string>();

	for (const s of sections) {
		const owned = [...s.keys, ...(s.hiddenKeys ?? [])];

		for (const k of owned) {
			const fullKey = `mentor.${k}`;

			if (!(fullKey in packageProperties)) {
				errors.push(`Section '${s.id}' references unknown setting '${fullKey}'`);
			}

			const prior = claimed.get(k);

			if (prior) {
				errors.push(`Setting '${fullKey}' is claimed by both '${prior}' and '${s.id}'`);
			}

			claimed.set(k, s.id);
		}
	}

	for (const fullKey of Object.keys(packageProperties)) {
		if (!fullKey.startsWith('mentor.')) {
			continue;
		}

		const k = fullKey.slice('mentor.'.length);

		// Settings marked as store-overridable query templates are discovered and rendered
		// dynamically by the store editor, so they need no explicit section claim.
		const isStoreQuery = !!(packageProperties[fullKey] as { storeQueryKind?: unknown })?.storeQueryKind;

		if (!claimed.has(k) && !isStoreQuery) {
			errors.push(`Setting '${fullKey}' is not owned by any section`);
		}
	}

	return errors;
}