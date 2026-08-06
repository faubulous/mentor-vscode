import * as vscode from 'vscode';
import { activateExtension } from './extension';

export async function activate(context: vscode.ExtensionContext) {
	return activateExtension(context);
}

export { deactivate } from './extension';
