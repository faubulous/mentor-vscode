import * as vscode from 'vscode';

/**
 * Interface for the MicrosoftAuthService.
 */
export interface IMicrosoftAuthService {
	/**
	 * Checks if there's an existing session without prompting the user.
	 * @param scopes The OAuth scopes to check.
	 * @param createIfNone If true, creates a new session if none exists.
	 * @returns A promise that resolves to the authentication session if a session exists, or undefined.
	 */
	getSession(scopes: string[], createIfNone?: boolean): Promise<vscode.AuthenticationSession | undefined>;
}
