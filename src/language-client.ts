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
	abstract get languageName(): string;

	/**
	 * The language ID for the language client.
	 */
	abstract get languageId(): string;

	/**
	 * The channel ID for logging.
	 */
	readonly channelName = "Mentor Language";

	/**
	 * The channel ID for logging.
	 */
	readonly channelId = "mentor.language";

	/**
	 * The output channel.
	 */
	readonly channel: vscode.OutputChannel;

	/**
	 * The workspace folder.
	 */
	readonly workspaceFolder: vscode.WorkspaceFolder;

	/**
	 * The VS Code language client.
	 */
	client: LanguageClient | undefined;

	constructor(workspaceFolder: vscode.WorkspaceFolder) {
		this.channel = vscode.window.createOutputChannel(this.channelName, this.channelId);
		this.workspaceFolder = workspaceFolder;
	}

	activate(context: vscode.ExtensionContext) {
		const module = context.asAbsolutePath(this.serverPath);

		const serverOptions = {
			run: { module, transport: TransportKind.ipc },
			debug: { module, transport: TransportKind.ipc }
		};

		const clientOptions: LanguageClientOptions = {
			diagnosticCollectionName: this.channelId,
			documentSelector: [{ language: this.languageId }],
			workspaceFolder: this.workspaceFolder,
			outputChannel: this.channel
		};

		this.client = new LanguageClient(this.channelId, `${this.languageName} Language Client`, serverOptions, clientOptions);
		this.client.start();
	}

	async deactivate() {
		if (this.client) {
			await this.client.stop();
		}
	}
}