import { EntraClientAuthCredential } from './credential';

/**
 * Token response from the Microsoft Entra ID token endpoint.
 */
interface TokenResponse {
	access_token: string;
	token_type: string;
	expires_in: number;
	ext_expires_in?: number;
}

/**
 * Error response from the Microsoft Entra ID token endpoint.
 */
interface TokenErrorResponse {
	error: string;
	error_description: string;
	error_codes?: number[];
	timestamp?: string;
	trace_id?: string;
	correlation_id?: string;
}

/**
 * A buffer time (in milliseconds) before the token's actual expiration to trigger a refresh.
 * Tokens are refreshed 5 minutes before they expire.
 */
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * Service for acquiring OAuth 2.0 access tokens using the Client Credentials Flow
 * against Microsoft Entra ID (Azure AD).
 * 
 * This flow is used for service-to-service authentication where no user interaction
 * is required. The application authenticates using its own identity (client ID + secret)
 * rather than on behalf of a user.
 * 
 * Token endpoint: `https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`
 */
export class EntraClientCredentialService {
	/**
	 * In-memory token cache keyed by `{tenantId}:{clientId}`.
	 */
	private static _tokenCache = new Map<string, { accessToken: string; expiresAt: number }>();

	/**
	 * Acquires an access token using the Client Credentials Grant.
	 * Returns a cached token if it is still valid; otherwise, requests a new one.
	 * 
	 * @param credential The Entra Client Credential configuration.
	 * @returns A promise that resolves to an access token string.
	 * @throws An error if the token request fails.
	 */
	async acquireToken(credential: EntraClientAuthCredential): Promise<string> {
		const cacheKey = `${credential.tenantId}:${credential.clientId}`;
		const cached = EntraClientCredentialService._tokenCache.get(cacheKey);

		if (cached && cached.expiresAt > Date.now() + TOKEN_EXPIRY_BUFFER_MS) {
			return cached.accessToken;
		}

		const tokenEndpoint = `https://login.microsoftonline.com/${credential.tenantId}/oauth2/v2.0/token`;
		const scope = credential.scopes.join(' ');

		const body = new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: credential.clientId,
			client_secret: credential.clientSecret,
			scope: scope
		});

		const response = await fetch(tokenEndpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: body.toString()
		});

		if (!response.ok) {
			let errorMessage: string;

			try {
				const errorBody = await response.json() as TokenErrorResponse;
				errorMessage = errorBody.error_description || errorBody.error || response.statusText;
			} catch {
				errorMessage = await response.text() || response.statusText;
			}

			throw new Error(`Failed to acquire token from Entra ID: ${errorMessage}`);
		}

		const tokenResponse = await response.json() as TokenResponse;
		const expiresAt = Date.now() + tokenResponse.expires_in * 1000;

		EntraClientCredentialService._tokenCache.set(cacheKey, {
			accessToken: tokenResponse.access_token,
			expiresAt
		});

		return tokenResponse.access_token;
	}

	/**
	 * Clears the cached token for the given credential.
	 * 
	 * @param credential The Entra Client Credential configuration.
	 */
	clearCache(credential: EntraClientAuthCredential): void {
		const cacheKey = `${credential.tenantId}:${credential.clientId}`;
		EntraClientCredentialService._tokenCache.delete(cacheKey);
	}

	/**
	 * Clears all cached tokens.
	 */
	clearAllCaches(): void {
		EntraClientCredentialService._tokenCache.clear();
	}
}
