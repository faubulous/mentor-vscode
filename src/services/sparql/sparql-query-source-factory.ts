import { SparqlConnection, SparqlStoreType } from './sparql-connection';
import { ComunicaSource } from './sparql-query-source';
import { ISparqlQuerySourceProvider } from './sparql-query-source-provider.interface';

/**
 * Factory for creating Comunica-compatible query sources based on connection type.
 * 
 * This factory manages a registry of providers, each handling a specific store type.
 * It delegates query source creation to the appropriate provider based on the
 * connection's store type.
 */
export class SparqlQuerySourceFactory {
    private readonly _providers = new Map<SparqlStoreType, ISparqlQuerySourceProvider>();
	
    private _defaultProvider?: ISparqlQuerySourceProvider;

    /**
     * Registers a query source provider for a specific store type.
     * @param provider The provider to register.
     */
    registerProvider(provider: ISparqlQuerySourceProvider): void {
        this._providers.set(provider.storeType, provider);
    }

    /**
     * Sets the default provider to use when no specific provider is found.
     * @param provider The default provider.
     */
    setDefaultProvider(provider: ISparqlQuerySourceProvider): void {
        this._defaultProvider = provider;
    }

    /**
     * Gets the provider for a specific store type.
     * @param storeType The store type.
     * @returns The provider, or undefined if not found.
     */
    getProvider(storeType: SparqlStoreType): ISparqlQuerySourceProvider | undefined {
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
    async createQuerySource(connection: SparqlConnection, inferenceEnabled: boolean): Promise<ComunicaSource> {
        const storeType = connection.storeType ?? 'sparql';
        const provider = this._providers.get(storeType) ?? this._defaultProvider;

        if (!provider) {
            throw new Error(`No query source provider registered for store type: ${storeType}`);
        }

        return provider.createQuerySource(connection, { inferenceEnabled });
    }
}
