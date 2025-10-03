import * as vscode from 'vscode';

/**
 * Connection information for a SPARQL endpoint.
 */
export interface SparqlEndpoint {
    /**
     * The identifier of the connection, usually a UUID.
     */
    id: string;

    /**
     * The SPARQL endpoint URL (e.g., 'https://dbpedia.org/sparql' or 'workspace://')
     */
    endpointUrl: string;

    /**
     * The location where the connection is stored, either the workspace folder or the global settings.
     */
    configTarget: vscode.ConfigurationTarget;

    /**
     * Indicates if this connection is newly created and not yet saved.
     */
    isNew?: boolean;

    /**
     * Indicates if this connection has unsaved changes.
     */
    isModified?: boolean;
}