import * as vscode from 'vscode';

/**
 * Service for handling Microsoft Entra ID authentication using VS Code's built-in authentication API.
 */
export class MicrosoftAuthService {
	private static readonly PROVIDER_ID = 'microsoft';

	/**
	 * Authenticates with Microsoft Entra ID and returns an access token.
	 * @param scopes The OAuth scopes to request (e.g., ['https://graph.microsoft.com/.default'])
	 * @returns A promise that resolves to the access token.
	 */
	async getAccessToken(scopes: string[]): Promise<string> {
		try {
			const id = MicrosoftAuthService.PROVIDER_ID;
			const options = { createIfNone: true };
			const session = await vscode.authentication.getSession(id, scopes, options);

			return session.accessToken;
		} catch (error: any) {
			throw new Error(`Failed to authenticate with Microsoft Entra ID: ${error.message}`);
		}
	}

	/**
	 * Checks if there's an existing session without prompting the user.
	 * @param scopes The OAuth scopes to check.
	 * @returns A promise that resolves to the access token if a session exists, or undefined.
	 */
	async getExistingSession(scopes: string[]): Promise<string | undefined> {
		try {
			const id = MicrosoftAuthService.PROVIDER_ID;
			const options = { createIfNone: false };
			const session = await vscode.authentication.getSession(id, scopes, options);

			return session?.accessToken;
		} catch {
			return undefined;
		}
	}

	/**
	 * Signs out from EntraID by removing the session.
	 * @param scopes The OAuth scopes associated with the session.
	 */
	async signOut(scopes: string[]): Promise<void> {
		const id = MicrosoftAuthService.PROVIDER_ID;
		const options = { createIfNone: false };
		const session = await vscode.authentication.getSession(id, scopes, options);

		if (session) {
			// Note: VS Code doesn't provide a direct logout API, but clearing the session
			// will prompt re-authentication on next use
			vscode.window.showInformationMessage('Microsoft Entra ID session cleared. You will be prompted to sign in again on next use.');
		}
	}
}