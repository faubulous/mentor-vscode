import { SparqlConnection, SparqlStoreType } from './sparql-connection';
import { ComunicaEndpoint } from './sparql-endpoint';
import { ISparqlEndpointProvider } from './sparql-endpoint-provider.interface';

/**
 * Factory for creating Comunica-compatible query sources based on connection type.
 * 
 * This factory manages a registry of providers, each handling a specific store type.
 * It delegates query source creation to the appropriate provider based on the
 * connection's store type.
 */
export class SparqlEndpointFactory {
    private readonly _providers = new Map<SparqlStoreType, ISparqlEndpointProvider>();
	
    private _defaultProvider?: ISparqlEndpointProvider;

    /**
     * Registers a query source provider for a specific store type.
     * @param provider The provider to register.
     */
    registerProvider(provider: ISparqlEndpointProvider): void {
        this._providers.set(provider.storeType, provider);
    }

    /**
     * Sets the default provider to use when no specific provider is found.
     * @param provider The default provider.
     */
    setDefaultProvider(provider: ISparqlEndpointProvider): void {
        this._defaultProvider = provider;
    }

    /**
     * Gets the provider for a specific store type.
     * @param storeType The store type.
     * @returns The provider, or undefined if not found.
     */
    getProvider(storeType: SparqlStoreType): ISparqlEndpointProvider | undefined {
        return this._providers.get(storeType);
    }

    /**
     * Checks if a store type supports inference toggling.
     * @param storeType The store type to check.
     * @returns `true` if the store type supports inference toggling.
     */
    supportsInference(storeType: SparqlStoreType): boolean {
        const provider = this._providers.get(storeType);
        return provider?.supportsInference ?? false;
    }

    /**
     * Creates a Comunica-compatible query source for the given connection.
     * @param connection The SPARQL connection.
     * @param inferenceEnabled Whether inference should be enabled.
     * @returns A promise that resolves to a ComunicaSource configuration.
     */
    async createQuerySource(connection: SparqlConnection, inferenceEnabled: boolean): Promise<ComunicaEndpoint> {
        const storeType = connection.storeType ?? 'sparql';
        const provider = this._providers.get(storeType) ?? this._defaultProvider;

        if (!provider) {
            throw new Error(`No query source provider registered for store type: ${storeType}`);
        }

        return provider.createEndpoint(connection, { inferenceEnabled });
    }

    /**
     * Retrieves the list of named graphs available from the query source.
     * @param connection The SPARQL connection.
     * @param inferenceEnabled Whether inference should be enabled.
     * @returns A promise that resolves to an array of graph IRIs.
     */
    async getGraphs(connection: SparqlConnection, inferenceEnabled: boolean): Promise<string[]> {
        const storeType = connection.storeType ?? 'sparql';
        const provider = this._providers.get(storeType) ?? this._defaultProvider;

        if (!provider) {
            throw new Error(`No query source provider registered for store type: ${storeType}`);
        }

        return provider.getGraphs(connection, { inferenceEnabled });
    }
}
