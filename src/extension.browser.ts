import * as vscode from 'vscode';
import { createBrowserLanguageClient } from './languages/language-client-factory.browser';
import { activateExtension } from './extension';

export async function activate(context: vscode.ExtensionContext) {
	return activateExtension(context, createBrowserLanguageClient);
}

export { deactivate } from './extension';