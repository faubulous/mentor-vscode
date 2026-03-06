import { AuthCredential } from '@src/services/core/credential';

/**
 * Interface for the CredentialStorageService.
 */
export interface ICredentialStorageService {
	/**
	 * Stores a credential for the given URI.
	 * @param uri The URI for which to store the credential.
	 * @param credential The credential to store.
	 */
	saveCredential(uri: string, credential: AuthCredential): Promise<void>;

	/**
	 * Retrieves the stored credential for the given URI.
	 * @param uri The URI for which to retrieve the credential.
	 * @returns The stored credential, or undefined if none is found.
	 */
	getCredential(uri: string): Promise<AuthCredential | undefined>;

	/**
	 * Deletes the stored credential for the given URI.
	 * @param uri The URI for which to delete the credential.
	 */
	deleteCredential(uri: string): Promise<void>;

	/**
	 * Updates the stored credential for the given URI.
	 * @param uri The URI for which to update the credential.
	 * @param credential The new credential to store.
	 */
	updateCredential(uri: string, credential: AuthCredential): Promise<void>;
}
