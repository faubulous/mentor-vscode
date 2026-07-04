import { AuthCredential, EntraClientAuthCredential } from '@src/services/core/credential';
import { EntraClientCredentialService } from '@src/services/core/entra-client-credential-service';

/**
 * Builds a provider that resolves the `Authorization` header value for the given credential.
 * Returns `undefined` when no usable credential is available (no credential, unknown type, or
 * a Microsoft credential without an access token), in which case no header should be sent.
 *
 * Prefer the provider over a one-shot value when the header is needed per request: for
 * Entra client credentials it acquires a fresh token on every invocation.
 * @param credential The authentication credential, if any.
 * @returns A function resolving the header value, or `undefined` if there is no usable credential.
 */
export function getAuthorizationHeaderProvider(credential?: AuthCredential): (() => Promise<string | undefined>) | undefined {
	if (credential?.type === 'basic') {
		const encoded = btoa(`${credential.username}:${credential.password}`);
		return async () => `Basic ${encoded}`;
	}

	if (credential?.type === 'bearer') {
		const prefix = credential.prefix || 'Bearer';
		const token = credential.token;
		return async () => `${prefix} ${token}`;
	}

	if (credential?.type === 'microsoft') {
		const accessToken = credential.accessToken;

		if (!accessToken) {
			return undefined;
		}

		return async () => `Bearer ${accessToken}`;
	}

	if (credential?.type === 'entra-client-credentials') {
		const entraCredential = credential as EntraClientAuthCredential;
		const tokenService = new EntraClientCredentialService();
		return async () => `Bearer ${await tokenService.acquireToken(entraCredential)}`;
	}

	return undefined;
}

/**
 * Resolves the `Authorization` header value for the given credential once.
 * @param credential The authentication credential, if any.
 * @returns The header value, or `undefined` when no usable credential is available.
 */
export async function getAuthorizationHeader(credential?: AuthCredential): Promise<string | undefined> {
	return getAuthorizationHeaderProvider(credential)?.();
}
