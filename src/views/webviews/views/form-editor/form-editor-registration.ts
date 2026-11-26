import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { FormEditorProvider } from './form-editor-provider';

/**
 * Register the form editor. It is contributed with the `option` priority, so it never replaces the
 * text editor unless the user asks for it: with the editor title bar, or by making it the default
 * editor of a file type with VS Code's "Set Default for ..." or "Configure default editor for
 * ...". Mentor leaves those associations to the user and never writes them.
 * @param context The extension context.
 */
export function registerFormEditor(context: vscode.ExtensionContext): void {
	container.registerInstance(ServiceToken.DefinitionRevealTarget, new FormEditorProvider(context));
}
