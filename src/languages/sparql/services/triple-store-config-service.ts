import * as vscode from 'vscode';
import { getConfig } from '@src/utilities/vscode/config';
import { PRESET_STORES } from './default-stores';
import { SparqlConnection } from './sparql-connection';
import { TripleStoreConfig, SparqlQueryKind, TRIPLE_STORE_QUERY_KIND_PROPERTY } from './triple-store-config';
import { ITripleStoreConfigService } from './triple-store-config-service.interface';

/**
 * Service responsible for store-type configuration: reading store configs from settings,
 * resolving a config by id, answering capability questions (inference support,
 * workspace identity), and resolving effective query templates.
 */
export class TripleStoreConfigService implements ITripleStoreConfigService {

	/**
	 * VS Code settings key under which user-defined store configs are persisted.
	 */
	private readonly _storesConfigKey = 'sparql.stores';

	/**
	 * The id of the internal, code-only in-memory workspace store.
	 */
	private readonly _workspaceStoreType = 'workspace';

	/**
	 * The store type assumed for connections that do not specify one.
	 */
	readonly defaultStoreType = 'sparql';

	/**
	 * Returns the available store configs: the built-in read-only presets followed by the
	 * user- and workspace-defined stores. Because `sparql.stores` is an array, VS Code does
	 * not merge it across scopes — the highest scope replaces the others — which would hide
	 * user-scope store types whenever a workspace value exists. We therefore union the user
	 * and workspace arrays (workspace overriding user by `id`) so every defined store type is
	 * selectable. Settings entries whose id collides with a preset are ignored: presets
	 * cannot be shadowed, and stale copies from the former first-run seeding stay hidden.
	 * @returns An array of store configs in display order (presets first).
	 */
	getStoreConfigs(): TripleStoreConfig[] {
		const config = getConfig();
		const inspected = config.inspect<TripleStoreConfig[]>(this._storesConfigKey);
		const presetIds = new Set(PRESET_STORES.map(s => s.id));

		// Fall back to the merged effective value when inspect is unavailable.
		if (!inspected) {
			const stores = config.get<TripleStoreConfig[]>(this._storesConfigKey) ?? [];

			return [...PRESET_STORES, ...stores.filter(s => !presetIds.has(s.id))];
		} else {
			const merged = new Map<string, TripleStoreConfig>();

			for (const store of [
				...(inspected.globalValue ?? []),
				...(inspected.workspaceValue ?? []),
			]) {
				if (!presetIds.has(store.id)) {
					merged.set(store.id, store);
				}
			}

			return [...PRESET_STORES, ...merged.values()];
		}
	}

	/**
	 * Resolves a store config by its id (store type).
	 * @param storeType The store-type id. Defaults to the generic SPARQL endpoint when `undefined`.
	 * @returns The matching store config, or `undefined` if no config has that id.
	 */
	getStoreConfig(storeType: string | undefined): TripleStoreConfig | undefined {
		return this.getStoreConfigs().find(s => s.id === (storeType ?? this.defaultStoreType));
	}

	/**
	 * Checks if the given connection supports inference toggling.
	 * The workspace connection always supports inference. For all other connections, support
	 * is determined by the store config's `inference.supported` flag.
	 * @param connection The SPARQL connection to check.
	 * @returns `true` if the connection supports inference, `false` otherwise.
	 */
	supportsInference(connection: SparqlConnection): boolean {
		if (this.isWorkspaceConnectionId(connection.id) || connection.storeType === this._workspaceStoreType) {
			return true;
		} else {
			return this.getStoreConfig(connection.storeType)?.inference?.supported ?? false;
		}
	}

	/**
	 * Returns whether the connection targets the internal in-memory workspace store.
	 * @param connection The SPARQL connection to test.
	 * @returns `true` if the connection is the workspace store.
	 */
	isWorkspaceConnectionId(connectionId: string): boolean {
		return connectionId === this._workspaceStoreType;
	}

	/**
	 * Cached `kind → mentor config key` map, built from package.json on first use.
	 */
	private _storeQueryConfigKeys: Map<string, string> | undefined;

	/**
	 * Maps each {@link SparqlQueryKind} to the `mentor.*` config key (without the `mentor.` prefix) of
	 * the setting it overrides, by scanning the extension's package.json for properties carrying the
	 * {@link TRIPLE_STORE_QUERY_KIND_PROPERTY} marker. Result is cached for the session.
	 */
	private _getStoreQueryConfigKeys(): Map<string, string> {
		if (this._storeQueryConfigKeys) {
			return this._storeQueryConfigKeys;
		} else {
			const packageJSON = vscode.extensions.getExtension('faubulous.mentor')?.packageJSON;

			const configuration = packageJSON?.contributes?.configuration?.[0];
			const properties = (configuration?.properties ?? {}) as Record<string, Record<string, unknown>>;

			const map = new Map<string, string>();

			for (const [fullKey, prop] of Object.entries(properties)) {
				const kind = prop[TRIPLE_STORE_QUERY_KIND_PROPERTY];

				if (typeof kind === 'string') {
					map.set(kind, fullKey.replace(/^mentor\./, ''));
				}
			}

			this._storeQueryConfigKeys = map;

			return map;
		}
	}

	/**
	 * Resolves the effective SPARQL query template of the given kind for a connection.
	 * Resolution order: the store config's own query → global `mentor.sparql.*` fallback.
	 * @param connection The SPARQL connection.
	 * @param kind The kind of query template to resolve.
	 * @returns The resolved template, or `undefined` if none is configured at any level.
	 */
	getQueryTemplate(connection: SparqlConnection, kind: SparqlQueryKind): string | undefined {
		const override = this.getStoreConfig(connection.storeType)?.queries?.[kind];

		if (override) {
			return override;
		}

		// The global fallback key is discovered from the setting marked with this kind in package.json,
		// so package.json stays the single source of truth for which queries are store-overridable.
		const key = this._getStoreQueryConfigKeys().get(kind);

		return key ? getConfig().get<string>(key) : undefined;
	}
}
