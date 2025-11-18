import * as vscode from 'vscode';
import { MicrosoftAuthService } from '@src/services/microsoft-auth-service';
import { CredentialFactory } from '@src/services/credential-factory';

export const loginMicrosoftAuthProvider = {
    id: 'mentor.command.loginMicrosoftAuthProvider',
    handler: async (authScopes?: string[]) => {
        try {
            const scopes = authScopes ?? ['https://graph.microsoft.com/.default'];
            const session = await new MicrosoftAuthService().getSession(scopes, true);

            if (session) {
                vscode.window.showInformationMessage(`Successfully authenticated with Microsoft Entra.`);

                return CredentialFactory.createMicrosoftAuthCredential(scopes, session.id, session.accessToken);
            } else {
                vscode.window.showWarningMessage(`Microsoft Entra authentication was cancelled.`);
                
                return null;
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Microsoft Entra authentication failed: ${error.message}`);

            return null;
        }
    }
};