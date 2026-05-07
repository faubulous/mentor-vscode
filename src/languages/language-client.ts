import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { LanguageClientFactory, ILanguageClient } from './language-client-factory';
import { ILanguageClientRegistry } from './language-client-registry';

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

	private readonly _languageClientRegistry: Partial<ILanguageClientRegistry>;

	constructor(languageId: string, languageName: string) {
		this.languageName = languageName;
		this.languageId = languageId;
		this.channelName = `Mentor Language (${languageName})`;
		this.channelId = `mentor.language.${languageId}`;
		this.channel = vscode.window.createOutputChannel(this.channelName, this.channelId);
		this.serverPath = `dist/${languageId}-language-server.js`;
		this._languageClientRegistry = container.resolve<Partial<ILanguageClientRegistry>>(ServiceToken.LanguageClientRegistry);

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

		this._languageClientRegistry.register?.(this.languageId, this.client);

		this.client.start();
	}

	async dispose() {
		this._languageClientRegistry.unregister?.(this.languageId);

		if (this.client) {
			await this.client.stop();
		}
	}
}