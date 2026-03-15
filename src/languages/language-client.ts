import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { LanguageClientFactory, ILanguageClient } from './language-client-factory';

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
	client: ILanguageClient | undefined;

	constructor(languageId: string, languageName: string) {
		this.languageName = languageName;
		this.languageId = languageId;
		this.channelName = `Mentor Language (${languageName})`;
		this.channelId = `mentor.language.${languageId}`;
		this.channel = vscode.window.createOutputChannel(this.channelName, this.channelId);
		this.serverPath = `dist/${languageId}-language-server.js`;

		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(this);

		this.start(context);
	}

	protected start(context: vscode.ExtensionContext) {
		const factory = container.resolve<LanguageClientFactory>(ServiceToken.LanguageClientFactory);

		this.client = factory(context, {
			channelId: this.channelId,
			languageName: this.languageName,
			serverPath: this.serverPath,
			languageId: this.languageId,
			outputChannel: this.channel
		});

		this.client.start();
	}

	async dispose() {
		if (this.client) {
			await this.client.stop();
		}
	}
}