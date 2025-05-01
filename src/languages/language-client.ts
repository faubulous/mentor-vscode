import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions } from 'vscode-languageclient/browser';

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
		// Absolute path to the server module.
		const serverMain = vscode.Uri.joinPath(context.extensionUri, this.serverPath);

		// Create a new worker for the language server.
		const worker = new Worker(serverMain.toString(true));

		const clientOptions: LanguageClientOptions = {
			diagnosticCollectionName: this.channelId,
			documentSelector: [{ language: this.languageId }],
			outputChannel: this.channel
		};

		this.client = new LanguageClient(this.channelId, `${this.languageName} Language Client`, clientOptions, worker);
		this.client.start();
	}

	async dispose() {
		if (this.client) {
			await this.client.stop();
		}
	}
}