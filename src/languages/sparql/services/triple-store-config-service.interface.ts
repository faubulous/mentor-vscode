import { SparqlConnection } from './sparql-connection';
import { TripleStoreConfig } from './triple-store-config';

/**
 * Interface for the TripleStoreConfigService.
 */
export interface ITripleStoreConfigService {
	/**
	 * The store type assumed for connections that do not specify one.
	 */
	readonly defaultStoreType: string;

	/**
	 * Returns the user-defined store configs from the `mentor.sparql.stores` setting.
	 * VS Code provides the package.json default when the setting is unset at runtime.
	 * @returns An array of store configs in display order.
	 */
	getStoreConfigs(): TripleStoreConfig[];

	/**
	 * Resolves a store config by its id (store type).
	 * @param storeType The store-type id. Defaults to the generic SPARQL endpoint when `undefined`.
	 * @returns The matching store config, or `undefined` if no config has that id.
	 */
	getStoreConfig(storeType: string | undefined): TripleStoreConfig | undefined;

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
	 * @param connection Id of the connection to check.
	 * @returns `true` if the connection is the workspace connection.
	 */
	isWorkspaceConnectionId(connectionId: string): boolean;
}
