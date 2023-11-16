import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, TransportKind } from 'vscode-languageclient/node';

export abstract class LanguageClientBase {
	/**
	 * Get the relative path to the compiled language server module.
	 */
	abstract get serverPath(): string;

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

	constructor(langaugeId: string, languageName: string) {
		this.languageName = languageName;
		this.languageId = langaugeId;
		this.channelName = `Mentor Language (${languageName})`;
		this.channelId = `mentor.language.${langaugeId}`;
		this.channel = vscode.window.createOutputChannel(this.channelName, this.channelId);
	}

	start(context: vscode.ExtensionContext) {
		console.log(`Starting ${this.languageName} Language Client..`);

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
	}

	async stop() {
		if (this.client) {
			await this.client.stop();
		}
	}
}