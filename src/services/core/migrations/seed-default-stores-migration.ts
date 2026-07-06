import * as vscode from 'vscode';
import { getConfig } from '@src/utilities/vscode/config';
import { TripleStoreConfig } from '@src/languages/sparql/services/triple-store-config';
import { DEFAULT_SEED_STORES } from '@src/languages/sparql/services/default-stores';
import { ISettingsMigration } from '../settings-migration.interface';

/**
 * Seeds the built-in store catalog ({@link DEFAULT_SEED_STORES}: Jena, RDF4J, QLever)
 * into the user's global `mentor.sparql.stores` setting as ordinary, editable user stores (the
 * generic `sparql` store remains the protected manifest default).
 *
 * The pass **merges** the built-ins by id into whatever the user already has, adding only the ones
 * that are missing — so an existing/customized list is preserved while absent built-ins (e.g. a
 * fresh `qlever`) are added. It runs once per {@link SEED_VERSION} via a `globalState` marker, so it
 * does not re-add stores the user deletes afterwards.
 */
export class SeedDefaultStoresMigration implements ISettingsMigration {
	/**
	 * The unique identifier for this migration.
	 */
	readonly id = 'seed-default-stores';

	/**
	 * A description of what this migration does.
	 */
	readonly description = 'Seed the built-in SPARQL store catalog into user settings on first run.';

	/**
	 * VS Code configuration key for the SPARQL stores list.
	 */
	readonly storesKey = "sparql.stores";

	/**
	 * Bump to make the seed perform one more top-up pass for all users.
	 */
	readonly seedVersion = 1;

	/**
	 * `globalState` key recording the highest seed version that has already run. Using a version
	 * (rather than a boolean) lets a corrected/extended seed run exactly once more when {@link SEED_VERSION}
	 * is bumped, without otherwise re-running on every activation.
	 */
	readonly seedVersionKey = "mentor.sparql.storesSeedVersion";

	constructor(private readonly _context: vscode.ExtensionContext) { }

	async migrate(): Promise<void> {
		const context = this._context;

		// This seed version already ran — do nothing (don't re-add user-deleted stores).
		if (context.globalState.get<number>(this.seedVersionKey, 0) >= this.seedVersion) {
			return;
		} else {
			const config = getConfig();
			const inspected = config.inspect<TripleStoreConfig[]>(this.storesKey);
			const existing = inspected?.globalValue ?? [];
			const existingIds = new Set(existing.map(s => s.id));

			// Append only the built-ins the user doesn't already have, preserving their entries.
			const missing = DEFAULT_SEED_STORES.filter(s => !existingIds.has(s.id));

			if (missing.length > 0) {
				await config.update(this.storesKey, [...existing, ...missing], vscode.ConfigurationTarget.Global);
			}

			await context.globalState.update(this.seedVersionKey, this.seedVersion);
		}
	}
}
