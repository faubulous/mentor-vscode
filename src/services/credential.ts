/**
 * Represents a credential, either Basic (username/password) or Bearer token.
 */
export type AuthCredential = BasicAuthCredential | BearerAuthCredential | MicrosoftAuthCredential;

export type BasicAuthCredential = { type: 'basic'; username: string; password: string };

export type BearerAuthCredential = { type: 'bearer'; prefix: string; token: string };

export type MicrosoftAuthCredential = { type: 'microsoft'; scopes: string[] }