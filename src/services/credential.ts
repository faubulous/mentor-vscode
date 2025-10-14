/**
 * Represents a credential, either Basic (username/password) or Bearer token.
 */
export type AuthCredential = BasicAuthCredential | BearerAuthCredential;

export type BasicAuthCredential = { type: 'basic'; username: string; password: string };

export type BearerAuthCredential = { type: 'bearer'; prefix: string; token: string };