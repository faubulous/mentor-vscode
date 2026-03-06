import * as vscode from 'vscode';

/**
 * Service for handling Microsoft Entra ID authentication using VS Code's built-in authentication API.
 */
export class MicrosoftAuthService {
	private static readonly PROVIDER_ID = 'microsoft';

	/**
	 * Checks if there's an existing session without prompting the user.
	 * @param scopes The OAuth scopes to check.
	 * @returns A promise that resolves to the access token if a session exists, or undefined.
	 */
	async getSession(scopes: string[], createIfNone: boolean = false): Promise<vscode.AuthenticationSession | undefined> {
		try {
			const id = MicrosoftAuthService.PROVIDER_ID;
			const options = { createIfNone: createIfNone };
			const session = await vscode.authentication.getSession(id, scopes, options);

			return session;
		} catch {
			return undefined;
		}
	}
}