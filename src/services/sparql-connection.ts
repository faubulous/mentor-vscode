/**
 * Defines where a SPARQL connection is stored.
 * - 'project': Stored in .vscode/settings.json, shared with the team.
 * - 'user': Stored in the user's global settings, private to the user.
 * - 'internal': The non-persistent, built-in Mentor store.
 */
export type SparqlConnectionScope = 'project' | 'user';

/**
 * Represents a SPARQL endpoint connection.
 * Credentials are not stored here; they are managed by SecretStorage.
 */
export interface SparqlConnection {
    id: string;
    label: string;
    endpoint: string;
    scope: SparqlConnectionScope | 'workspace';
}

/**
 * Represents the credentials for a SPARQL connection.
 */
export interface SparqlConnectionCredentials {
    username?: string;
    password?: string;
}