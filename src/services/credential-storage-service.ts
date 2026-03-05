import * as vscode from 'vscode';
import { injectable } from 'tsyringe';
import { container } from 'tsyringe';
import { AuthCredential } from './credential';
import { SECRET_STORAGE_TOKEN } from '../container';

/**
 * Service for managing credentials using the SecretStorage of Visual Studio Code.
 */
@injectable()
export class CredentialStorageService {
    private get secretStorage(): vscode.SecretStorage {
        return container.resolve<vscode.SecretStorage>(SECRET_STORAGE_TOKEN);
    }

    private _getKey(uri: string): string {
        return `mentor.credentials:${uri}`;
    }

    /**
     * Stores a credential for the given URI.
     * @param uri The URI for which to store the credential.
     * @param credential The credential to store.
     */
    async saveCredential(uri: string, credential: AuthCredential): Promise<void> {
        await this.secretStorage.store(this._getKey(uri), JSON.stringify(credential));
    }

    /**
     * Retrieves the stored credential for the given URI.
     * @param uri The URI for which to retrieve the credential.
     * @returns The stored credential, or undefined if none is found.
     */
    async getCredential(uri: string): Promise<AuthCredential | undefined> {
        const value = await this.secretStorage.get(this._getKey(uri));
        return value ? JSON.parse(value) as AuthCredential : undefined;
    }

    /**
     * Deletes the stored credential for the given URI.
     * @param uri The URI for which to delete the credential.
     */
    async deleteCredential(uri: string): Promise<void> {
        await this.secretStorage.delete(this._getKey(uri));
    }

    /**
     * Updates the stored credential for the given URI.
     * @param uri The URI for which to update the credential.
     * @param credential The new credential to store.
     */
    async updateCredential(uri: string, credential: AuthCredential): Promise<void> {
        await this.saveCredential(uri, credential);
    }
}