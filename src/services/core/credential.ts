/**
 * Represents a credential, either Basic (username/password) or Bearer token.
 */
export type AuthCredential = BasicAuthCredential | BearerAuthCredential | MicrosoftAuthCredential | EntraClientAuthCredential;

/**
 * Credential type for HTTP Basic authentication.
 */
export type BasicAuthCredential = {
	type: 'basic';

	/**
	 * The username to be used for authentication.
	 */
	username: string;

	/**
	 * The password to be used for authentication.
	 */
	password: string;
};

/**
 * Credential type for Bearer token authentication.
 */
export type BearerAuthCredential = {
	type: 'bearer';

	/**
	 * The prefix to be used in the Authorization header (e.g., "Bearer").
	 */
	prefix: string;

	/**
	 * The token to be used for authentication.
	 */
	token: string;
};

/**
 * Credential type for Microsoft Entra ID authentication.
 */
export type MicrosoftAuthCredential = {
	type: 'microsoft';

	/**
	 * The ID of the associated authentication session.
	 */
	sessionId?: string;

	/**
	 * The access token to be used for authentication.
	 */
	accessToken?: string;

	/**
	 * The scopes associated with the access token.
	 */
	scopes: string[];
};

/**
 * Credential type for Microsoft Entra ID Client Credentials Flow (OAuth 2.0).
 * Used for service-to-service authentication without user interaction.
 */
export type EntraClientAuthCredential = {
	type: 'entra-client-credentials';

	/**
	 * The Azure AD tenant ID.
	 */
	tenantId: string;

	/**
	 * The application (client) ID registered in Azure AD.
	 */
	clientId: string;

	/**
	 * The client secret for the application.
	 */
	clientSecret: string;

	/**
	 * The scopes to request (e.g., "https://graph.microsoft.com/.default").
	 */
	scopes: string[];

	/**
	 * The cached access token obtained from the token endpoint.
	 */
	accessToken?: string;

	/**
	 * The expiration time (Unix timestamp in milliseconds) of the cached access token.
	 */
	accessTokenExpiresAt?: number;
};