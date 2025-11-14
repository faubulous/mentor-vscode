import * as vscode from 'vscode';
import { MicrosoftAuthService } from '@src/services/microsoft-auth-service';

export const loginMicrosoftAuthProvider = {
    id: 'mentor.command.loginMicrosoftAuthProvider',
    handler: async (authScopes?: string[]) => {
        const authService = new MicrosoftAuthService();

        try {
            const scopes = authScopes ?? ['https://graph.microsoft.com/.default'];

            vscode.window.showInformationMessage('Initiating Microsoft Entra authentication...');

            const token = await authService.getAccessToken(scopes);

            if (token) {
                // Display partial token for verification (first 20 chars)
                const partialToken = token.substring(0, 20) + '...';
                const message = `Successfully authenticated with Entra. Token: ${partialToken}`;

                vscode.window.showInformationMessage(message);

                // Log full token to output channel for testing
                const outputChannel = vscode.window.createOutputChannel('Mentor Microsoft Entra');

                outputChannel.appendLine('Microsoft Entra Authentication Successful');
                outputChannel.appendLine(`Access Token: ${token}`);
                outputChannel.appendLine(`Token Length: ${token.length}`);
                outputChannel.show();
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Microsoft Entra authentication failed: ${error.message}`);
        }
    }
};