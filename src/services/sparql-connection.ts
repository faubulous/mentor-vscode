/**
 * Defines where a SPARQL connection is stored.
 * - 'repository': Stored in .vscode/settings.json, shared with the team.
 * - 'global': Stored in the user's global settings, private to the user.
 * - 'internal': The non-persistent, built-in Mentor store.
 */
export type SparqlConnectionScope = 'repository' | 'global';

/**
 * Represents a SPARQL endpoint connection.
 * Credentials are not stored here; they are managed by SecretStorage.
 */
export interface SparqlConnection {
    /**
     * The identifier of the connection, usually a UUID.
     */
    id: string;

    /**
     * The SPARQL endpoint URL (e.g., 'https://dbpedia.org/sparql' or 'workspace://')
     */
    endpointUrl: string;

    /**
     * The scope where the connection is stored.
     */
    scope: SparqlConnectionScope;
}