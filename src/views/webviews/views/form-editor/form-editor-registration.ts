import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { getConfig } from '@src/utilities/vscode/config';
import { DisabledFormEditorProvider } from './disabled-form-editor-provider';
import { FormEditorProvider } from './form-editor-provider';

/**
 * The setting that turns the experimental form editor on.
 */
const ENABLED_SETTING = 'mentor.formEditor.enabled';

/**
 * The action offered when the setting changed.
 */
const RELOAD_ACTION = 'Reload Window';

/**
 * Register the form editor when the experimental setting is on. The editor is contributed with
 * the `option` priority, so it never replaces the text editor unless the user asks for it: with
 * the editor title bar, or by making it the default editor of a file type with VS Code's
 * "Configure default editor for ...". While `mentor.formEditor.enabled` is off, a stand-in shows
 * the documents such an association opens in the text editor. A change of the setting takes
 * effect after a reload, which the user is offered.
 * @param context The extension context.
 */
export function registerFormEditor(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		vscode.workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration(ENABLED_SETTING)) {
				void _offerReload();
			}
		})
	);

	if (getConfig('formEditor').get<boolean>('enabled', false)) {
		container.registerInstance(ServiceToken.DefinitionRevealTarget, new FormEditorProvider(context));
	} else {
		new DisabledFormEditorProvider(context);
	}
}

/**
 * Offer to reload the window, so the changed setting takes effect.
 */
async function _offerReload(): Promise<void> {
	const choice = await vscode.window.showInformationMessage('The form editor setting takes effect after the window is reloaded.', RELOAD_ACTION);

	if (choice === RELOAD_ACTION) {
		await vscode.commands.executeCommand('workbench.action.reloadWindow');
	}
}
