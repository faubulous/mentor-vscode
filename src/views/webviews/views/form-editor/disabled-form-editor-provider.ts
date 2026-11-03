import * as vscode from 'vscode';
import { FormEditorProvider } from './form-editor-provider';

/**
 * Stands in for the form editor while it is disabled. VS Code opens a document in the form editor
 * when the user associated its file type with it, through "Configure default editor for ..."; an
 * association that outlives the enabled setting would otherwise leave VS Code without an editor
 * for the document. The stand-in shows the document in the text editor instead, in the column the
 * form editor was asked for, and closes its own tab. The associations are the user's and are left
 * as they are.
 */
export class DisabledFormEditorProvider implements vscode.CustomTextEditorProvider {
	/**
	 * Create the provider and register it with VS Code.
	 * @param context The extension context.
	 */
	constructor(context: vscode.ExtensionContext) {
		context.subscriptions.push(vscode.window.registerCustomEditorProvider(FormEditorProvider.viewType, this));
	}

	/**
	 * Show a document the form editor was asked for in the text editor.
	 * @param document The document.
	 * @param webviewPanel The panel of the tab VS Code opened for the form editor.
	 */
	async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel): Promise<void> {
		await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default', webviewPanel.viewColumn);

		webviewPanel.dispose();
	}
}
