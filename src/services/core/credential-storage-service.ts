import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { AuthCredential } from './credential';
import { ServiceToken } from '@src/services/tokens';

/**
 * Service for managing credentials using the SecretStorage of Visual Studio Code.
 */
export class CredentialStorageService {
    private get _secretStorage(): vscode.SecretStorage {
        const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
        return context.secrets;
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
        await this._secretStorage.store(this._getKey(uri), JSON.stringify(credential));
    }

    /**
     * Retrieves the stored credential for the given URI.
     * @param uri The URI for which to retrieve the credential.
     * @returns The stored credential, or undefined if none is found.
     */
    async getCredential(uri: string): Promise<AuthCredential | undefined> {
        const value = await this._secretStorage.get(this._getKey(uri));
        return value ? JSON.parse(value) as AuthCredential : undefined;
    }

    /**
     * Deletes the stored credential for the given URI.
     * @param uri The URI for which to delete the credential.
     */
    async deleteCredential(uri: string): Promise<void> {
        await this._secretStorage.delete(this._getKey(uri));
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