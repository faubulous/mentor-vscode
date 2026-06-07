import { getConfig } from '@src/utilities/vscode/config';
import { SparqlConnection } from './sparql-connection';
import { SparqlStoreConfig } from './sparql-store-config';

/**
 * Interface for the SparqlStoreConfigService.
 */
export interface ISparqlStoreConfigService {
	/**
	 * The store type assumed for connections that do not specify one.
	 */
	readonly defaultStoreType: string;

	/**
	 * Returns the user-defined store configs from the `mentor.sparql.storeTypes` setting.
	 * VS Code provides the package.json default when the setting is unset at runtime.
	 * @returns An array of store configs in display order.
	 */
	getStoreConfigs(): SparqlStoreConfig[];

	/**
	 * Resolves a store config by its id (store type).
	 * @param storeType The store-type id. Defaults to the generic SPARQL endpoint when `undefined`.
	 * @returns The matching store config, or `undefined` if no config has that id.
	 */
	getStoreConfig(storeType: string | undefined): SparqlStoreConfig | undefined;

	/**
	 * Checks if the given connection supports inference toggling.
	 * The workspace connection always supports inference. For all other connections, support
	 * is determined by the store config's `inference.supported` flag.
	 * @param connection The SPARQL connection to check.
	 * @returns `true` if the connection supports inference, `false` otherwise.
	 */
	supportsInference(connection: SparqlConnection): boolean;

	/**
	 * Returns whether the connection targets the internal in-memory workspace store.
	 * @param connection The SPARQL connection to test.
	 * @returns `true` if the connection is the workspace store.
	 */
	isWorkspaceConnection(connection: SparqlConnection): boolean;
}

/**
 * Service responsible for store-type configuration: reading store configs from settings,
 * resolving a config by id, and answering capability questions (inference support,
 * workspace identity). Query-template resolution and inference rewriting are handled
 * separately by `SparqlConnectionService`.
 */
export class SparqlStoreConfigService implements ISparqlStoreConfigService {

	/** VS Code settings key under which user-defined store configs are persisted. */
	private readonly _storesConfigKey = 'sparql.storeTypes';

	/** The id of the internal, code-only in-memory workspace store. */
	private readonly _workspaceStoreType = 'workspace';

	/** The store type assumed for connections that do not specify one. */
	readonly defaultStoreType = 'sparql';

	/**
	 * Returns the available store configs, merged across configuration scopes. Because
	 * `sparql.storeTypes` is an array, VS Code does not merge it across scopes — the highest
	 * scope replaces the others — which would hide built-in defaults and user-scope store types
	 * whenever a workspace value exists. We therefore union the default, user, and workspace
	 * arrays (later scopes overriding earlier by `id`) so every defined store type is selectable.
	 * @returns An array of store configs in display order (defaults first).
	 */
	getStoreConfigs(): SparqlStoreConfig[] {
		const config = getConfig();
		const inspected = config.inspect<SparqlStoreConfig[]>(this._storesConfigKey);

		// Fall back to the merged effective value when inspect is unavailable.
		if (!inspected) {
			return config.get<SparqlStoreConfig[]>(this._storesConfigKey) ?? [];
		}

		const merged = new Map<string, SparqlStoreConfig>();

		for (const store of [
			...(inspected.defaultValue ?? []),
			...(inspected.globalValue ?? []),
			...(inspected.workspaceValue ?? []),
		]) {
			merged.set(store.id, store);
		}

		return [...merged.values()];
	}

	/**
	 * Resolves a store config by its id (store type).
	 * @param storeType The store-type id. Defaults to the generic SPARQL endpoint when `undefined`.
	 * @returns The matching store config, or `undefined` if no config has that id.
	 */
	getStoreConfig(storeType: string | undefined): SparqlStoreConfig | undefined {
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
		if (this.isWorkspaceConnection(connection)) {
			return true;
		}

		return this.getStoreConfig(connection.storeType)?.inference?.supported ?? false;
	}

	/**
	 * Returns whether the connection targets the internal in-memory workspace store.
	 * @param connection The SPARQL connection to test.
	 * @returns `true` if the connection is the workspace store.
	 */
	isWorkspaceConnection(connection: SparqlConnection): boolean {
		return connection.id === this._workspaceStoreType
			|| (connection.storeType ?? this.defaultStoreType) === this._workspaceStoreType;
	}
}
