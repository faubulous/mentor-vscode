import * as vscode from 'vscode';
import { Store } from '@faubulous/mentor-rdf';
import { SparqlConnection } from './sparql-connection';
import { ComunicaEndpoint } from './sparql-endpoint';
import { TripleStoreConfig } from './triple-store-config';
import { ITripleStoreConfigService } from './triple-store-config-service.interface';
import { ISparqlConnectionRegistry } from './sparql-connection-registry.interface';
import { IDocumentConnectionService } from './document-connection-service.interface';
import { ISparqlQuerySourceFactory } from './sparql-query-source-factory.interface';
import { createFilteredSource } from './sparql-inference-filter';

/**
 * Builds Comunica-compatible query sources. The workspace store yields an in-memory
 * RDF/JS source; every other store type becomes an HTTP SPARQL endpoint whose URL
 * receives the store config's URL-parameter reasoning control (if any).
 */
export class SparqlQuerySourceFactory implements ISparqlQuerySourceFactory {
	constructor(
		private readonly _store: Store,
		private readonly _storeConfigService: ITripleStoreConfigService,
		private readonly _connectionRegistry: ISparqlConnectionRegistry,
		private readonly _documentConnectionService: IDocumentConnectionService
	) { }

	/**
	 * Gets a Comunica-compatible query source for a document or notebook cell. Uses the
	 * document-level inference setting if set, otherwise falls back to the connection setting.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns A promise that resolves to a Comunica source configuration.
	 */
	async getQuerySourceForDocument(documentUri: vscode.Uri): Promise<ComunicaEndpoint> {
		const connection = this._documentConnectionService.getConnectionForDocument(documentUri);
		const inferenceEnabled = this._documentConnectionService.getInferenceEnabledForDocument(documentUri);
		return this._createQuerySource(connection, inferenceEnabled);
	}

	/**
	 * Gets a Comunica-compatible query source for a specific connection.
	 * @param connection The SPARQL connection.
	 * @param inferenceEnabled Optional inference override; defaults to the connection's persisted setting.
	 * @returns A promise that resolves to a Comunica source configuration.
	 */
	async getQuerySourceForConnection(connection: SparqlConnection, inferenceEnabled?: boolean): Promise<ComunicaEndpoint> {
		const enabled = inferenceEnabled ?? this._connectionRegistry.getInferenceEnabled(connection.id);
		return this._createQuerySource(connection, enabled);
	}

	/**
	 * Builds a Comunica-compatible source for a connection.
	 * @param connection The SPARQL connection.
	 * @param inferenceEnabled Whether inference should be enabled.
	 * @returns The resolved Comunica source configuration.
	 */
	private _createQuerySource(connection: SparqlConnection, inferenceEnabled: boolean): ComunicaEndpoint {
		if (this._storeConfigService.isWorkspaceConnectionId(connection.id)) {
			if (!inferenceEnabled) {
				// Filter out inference graph quads.
				return {
					type: 'rdfjs',
					value: createFilteredSource(this._store),
				};
			} else {
				// Include all quads including inferred ones.
				return {
					type: 'rdfjs',
					value: this._store,
				};
			}
		} else {
			const store = this._storeConfigService.getStoreConfig(connection.storeType);

			let value = connection.endpointUrl;

			if (store?.inference?.supported && store.inference.urlParameters) {
				try {
					const url = new URL(connection.endpointUrl);

					this._applyUrlInference(url, store, inferenceEnabled);

					value = url.toString();
				} catch {
					// endpointUrl is not a valid absolute URL (e.g. mid-edit) — use it verbatim.
				}
			}

			return { type: 'sparql', value, connection, inferenceEnabled };
		}
	}

	/**
	 * Appends the store config's URL-parameter reasoning fragment to an endpoint URL, in place.
	 * No-op unless the store supports reasoning via `urlParameters` and the fragment is non-empty.
	 * @param url The endpoint URL to mutate.
	 * @param store The resolved store config.
	 * @param inferenceEnabled Whether inference is currently enabled.
	 */
	private _applyUrlInference(url: URL, store: TripleStoreConfig | undefined, inferenceEnabled: boolean): void {
		const inference = store?.inference;

		if (!inference?.supported || !inference.urlParameters) {
			return;
		}

		const fragment = (inferenceEnabled ? inference.urlParameters.enabled : inference.urlParameters.disabled)?.trim().replace(/^[?&]+/, '');

		if (!fragment) {
			return;
		}

		// Append verbatim, preserving the user's exact fragment (no re-encoding/reordering).
		const existing = url.search.replace(/^\?/, '');
		url.search = existing ? `${existing}&${fragment}` : fragment;
	}
}
