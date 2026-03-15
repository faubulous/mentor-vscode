import * as vscode from 'vscode';
import { createNodeLanguageClient } from './languages/language-client-factory.node';
import { activateExtension } from './extension';

export async function activate(context: vscode.ExtensionContext) {
	return activateExtension(context, createNodeLanguageClient);
}

export { deactivate } from './extension';
