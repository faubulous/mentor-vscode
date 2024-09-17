import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { IToken } from 'millan';
import { LanguageClient, LanguageClientOptions, TransportKind } from 'vscode-languageclient/node';

export abstract class LanguageClientBase implements vscode.Disposable {
	/**
	 * Get the relative path to the compiled language server module.
	 */
	readonly serverPath: string;

	/**
	 * Get the human readably name of the language.
	 */
	readonly languageName: string;

	/**
	 * The language ID for the language client.
	 */
	readonly languageId: string;

	/**
	 * The channel ID for logging.
	 */
	readonly channelName: string;

	/**
	 * The channel ID for logging.
	 */
	readonly channelId: string;

	/**
	 * The output channel.
	 */
	readonly channel: vscode.OutputChannel;

	/**
	 * The VS Code language client.
	 */
	client: LanguageClient | undefined;

	constructor(languageId: string, languageName: string) {
		this.languageName = languageName;
		this.languageId = languageId;
		this.channelName = `Mentor Language (${languageName})`;
		this.channelId = `mentor.language.${languageId}`;
		this.channel = vscode.window.createOutputChannel(this.channelName, this.channelId);
		this.serverPath = `out/${languageId}-language-server.js`;
	}

	start(context: vscode.ExtensionContext) {
		const module = context.asAbsolutePath(this.serverPath);

		const serverOptions = {
			run: { module, transport: TransportKind.ipc },
			debug: { module, transport: TransportKind.ipc }
		};

		const clientOptions: LanguageClientOptions = {
			diagnosticCollectionName: this.channelId,
			documentSelector: [{ language: this.languageId }],
			outputChannel: this.channel
		};

		this.client = new LanguageClient(this.channelId, `${this.languageName} Language Client`, serverOptions, clientOptions);
		this.client.start();

		this.client.onNotification('mentor/updateContext', (params: { uri: string, tokens: IToken[] }) => {
			console.log('mentor/updateContext', params.uri, params.tokens);

			let context = mentor.contexts[params.uri];

			if (context) {
				context.setTokens(params.tokens);
			} else {
				// TODO: Initialize a new document context with the tokens.
			}
		});
	}

	async dispose() {
		if (this.client) {
			await this.client.stop();
		}
	}
}