import { getConfig } from '@src/utilities/vscode/config';
import { SparqlConnection } from './sparql-connection';
import { TripleStoreConfig } from './triple-store-config';
import { ITripleStoreConfigService } from './triple-store-config-service.interface';

/**
 * Service responsible for store-type configuration: reading store configs from settings,
 * resolving a config by id, and answering capability questions (inference support,
 * workspace identity). Query-template resolution and inference rewriting are handled
 * separately by `SparqlConnectionService`.
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
	 * Returns the available store configs, merged across configuration scopes. Because
	 * `sparql.stores` is an array, VS Code does not merge it across scopes — the highest
	 * scope replaces the others — which would hide built-in defaults and user-scope store types
	 * whenever a workspace value exists. We therefore union the default, user, and workspace
	 * arrays (later scopes overriding earlier by `id`) so every defined store type is selectable.
	 * @returns An array of store configs in display order (defaults first).
	 */
	getStoreConfigs(): TripleStoreConfig[] {
		const config = getConfig();
		const inspected = config.inspect<TripleStoreConfig[]>(this._storesConfigKey);

		// Fall back to the merged effective value when inspect is unavailable.
		if (!inspected) {
			return config.get<TripleStoreConfig[]>(this._storesConfigKey) ?? [];
		} else {
			const merged = new Map<string, TripleStoreConfig>();

			for (const store of [
				...(inspected.defaultValue ?? []),
				...(inspected.globalValue ?? []),
				...(inspected.workspaceValue ?? []),
			]) {
				merged.set(store.id, store);
			}

			return [...merged.values()];
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
}
