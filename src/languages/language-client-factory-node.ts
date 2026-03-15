import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { LanguageClientFactory, LanguageClientFactoryOptions } from './language-client-factory';

/**
 * Creates a language client that communicates with a language server running
 * as a Node.js child process via IPC. This is used in the desktop extension host
 * and enables Node.js native capabilities such as CORS-free HTTP requests.
 */
export const createNodeLanguageClient: LanguageClientFactory = (
	context: vscode.ExtensionContext,
	options: LanguageClientFactoryOptions
) => {
	// Resolve the Node.js language server module path.
	// Node servers are built with a '-node' suffix (e.g. turtle-language-server-node.js).
	const nodeServerPath = options.serverPath.replace('.js', '-node.js');
	const serverModule = context.asAbsolutePath(nodeServerPath);

	const serverOptions: ServerOptions = {
		run: {
			module: serverModule,
			transport: TransportKind.ipc
		},
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
			options: { execArgv: ['--nolazy', '--inspect=6009'] }
		}
	};

	const clientOptions: LanguageClientOptions = {
		diagnosticCollectionName: options.channelId,
		documentSelector: [{ language: options.languageId }],
		outputChannel: options.outputChannel
	};

	return new LanguageClient(
		options.channelId,
		`${options.languageName} Language Client`,
		serverOptions,
		clientOptions
	);
};
