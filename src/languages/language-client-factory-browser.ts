import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions } from 'vscode-languageclient/browser';
import { LanguageClientFactory, LanguageClientFactoryOptions } from './language-client-factory';

/**
 * Creates a language client that communicates with a language server running
 * as a Web Worker. This is used in the browser extension host (vscode.dev, github.dev).
 */
export const createBrowserLanguageClient: LanguageClientFactory = (
	context: vscode.ExtensionContext,
	options: LanguageClientFactoryOptions
) => {
	const serverMain = vscode.Uri.joinPath(context.extensionUri, options.serverPath);
	const worker = new Worker(serverMain.toString(true));

	const clientOptions: LanguageClientOptions = {
		diagnosticCollectionName: options.channelId,
		documentSelector: [{ language: options.languageId }],
		outputChannel: options.outputChannel
	};

	return new LanguageClient(
		options.channelId,
		`${options.languageName} Language Client`,
		clientOptions,
		worker
	);
};
