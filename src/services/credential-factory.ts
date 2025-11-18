import {
	BasicAuthCredential,
	BearerAuthCredential,
	MicrosoftAuthCredential
} from "./credential";

/**
 * Factory class for creating different types of authentication credentials.
 */
export class CredentialFactory {
	/**
	 * Get the credential types supported by this factory class.
	 * @returns An array of supported credential types.
	 */
	static getCredentialTypes(): string[] {
		return ['basic', 'bearer', 'microsoft'];
	}

	/**
	 * Creates a Basic Authentication credential object.
	 * @param username Username to be used for authentication.
	 * @param password Password to be used for authentication.
	 * @returns A `BasicAuthCredential` object.
	 */
	static createBasicAuthCredential(username: string = '', password: string = ''): BasicAuthCredential {
		return {
			type: 'basic',
			username,
			password
		};
	}

	/**
	 * Creates a Bearer Authentication credential object.
	 * @param token The token to be used for authentication.
	 * @param prefix The token prefix, defaults to "Bearer".
	 * @returns A `BearerAuthCredential` object.
	 */
	static createBearerAuthCredential(token: string = '', prefix: string = 'Bearer'): BearerAuthCredential {
		return {
			type: 'bearer',
			token,
			prefix
		};
	}

	/**
	 * Creates a Microsoft Entra ID Authentication credential object.
	 * @param scopes The scopes to be used for authentication.
	 * @param sessionId The session ID of an active session (optional).
	 * @param accessToken The access token of an active session (optional).
	 * @returns A `MicrosoftAuthCredential` object.
	 */
	static createMicrosoftAuthCredential(
		scopes: string[] = ['https://graph.microsoft.com/.default'],
		sessionId?: string,
		accessToken?: string
	): MicrosoftAuthCredential {
		return {
			type: 'microsoft',
			scopes,
			sessionId,
			accessToken
		};
	}
}