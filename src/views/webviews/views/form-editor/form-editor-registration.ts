import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { getConfig } from '@src/utilities/vscode/config';
import { FormEditorDefaultView } from './form-editor-default-view';
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
 * its provider and the default view are only registered while `mentor.formEditor.enabled` is on.
 * A change of the setting takes effect after a reload, which the user is offered.
 * @param context The extension context.
 */
export function registerFormEditor(context: vscode.ExtensionContext): void {
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(event => {
		if (event.affectsConfiguration(ENABLED_SETTING)) {
			void _offerReload();
		}
	}));

	if (!getConfig('formEditor').get<boolean>('enabled', false)) {
		return;
	}

	container.registerInstance(ServiceToken.FormEditorProvider, new FormEditorProvider(context));

	const defaultView = new FormEditorDefaultView();

	container.registerInstance(ServiceToken.FormEditorDefaultView, defaultView);
	context.subscriptions.push(defaultView);
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
