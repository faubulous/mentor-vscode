import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { getConfig } from '@src/utilities/vscode/config';
import { FormEditorAssociations } from './form-editor-associations';
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
 * the `option` priority, so it never replaces the text editor unless the user asks for it, and
 * its provider is only registered while `mentor.formEditor.enabled` is on. A change of the
 * setting takes effect after a reload, which the user is offered. The editor associations that
 * make the form editor the default view follow the settings at all times, so turning the editor
 * off also takes it out of the associations.
 * @param context The extension context.
 */
export function registerFormEditor(context: vscode.ExtensionContext): void {
	context.subscriptions.push(
		new FormEditorAssociations(),
		vscode.workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration(ENABLED_SETTING)) {
				void _offerReload();
			}
		})
	);

	if (getConfig('formEditor').get<boolean>('enabled', false)) {
		container.registerInstance(ServiceToken.FormEditorProvider, new FormEditorProvider(context));
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
