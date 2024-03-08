import * as vscode from 'vscode';
import * as mentor from '../mentor';
import { ReferenceProvider } from './reference-provider';
import { DocumentContext } from '../document-context';
import { getPreviousToken, getUriFromToken } from '../utilities';
import { IToken } from 'millan';

/**
 * Provides hover information for tokens.
 */
export class CodeLensProvider extends ReferenceProvider implements vscode.CodeLensProvider {
	/**
	 * Indicates whether the workspace has been initialized.
	 */
	private _initialized: boolean = false;

	/**
	 * Indicates whether the provider is initializing.
	 */
	private _initializing: boolean = false;

	/**
	 * Indicates whether the provider is enabled.
	 */
	private _enabled: boolean = true;

	private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();

	onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

	constructor() {
		super();

		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('mentor.editor.codeLensEnabled')) {
				this._enabled = mentor.configuration.get('editor.codeLensEnabled', true);

				if (this._enabled) {
					this._onDidChangeCodeLenses.fire();
				}
			}
		});
	}

	private async _initialize() {
		this._initializing = true;
		this._initialized = false;

		this._enabled = mentor.configuration.get('editor.codeLensEnabled', true);

		if (this._enabled) {
			await mentor.indexer.waitForIndexed();

			mentor.onDidChangeVocabularyContext(() => {
				if (this._enabled) {
					this._onDidChangeCodeLenses.fire();
				}
			});
		}

		this._initialized = true;
		this._initializing = false;
	}

	provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
		return new Promise(async (resolve, reject) => {
			if (this._initializing) {
				return [];
			}

			if (!this._initialized) {
				await this._initialize();
			}

			if (!this._enabled) {
				return [];
			}

			const context = this.getDocumentContext(document);

			if (!context) {
				return [];
			}

			const result = [];

			for (let subject of this.getSubjects(context)) {
				let uri = getUriFromToken(context.namespaces, subject);

				if (!uri) continue;

				let n = this.provideReferencesForUri(uri);
				let location = this.getLocationFromToken(document.uri, subject);

				result.push(new vscode.CodeLens(location.range, {
					command: 'mentor.action.findReferences',
					title: n.length + ' references',
					arguments: [uri]
				}));
			}

			resolve(result);
		});
	}

	resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
		throw new Error('Method not implemented.');
	}

	private getSubjects(context: DocumentContext): IToken[] {
		const result = [];

		for (let token of context.tokens) {
			if (token.tokenType?.tokenName != "PNAME_LN" && token.tokenType?.tokenName != "IRIREF") {
				continue;
			}

			const p = getPreviousToken(context.tokens, token);

			if (!p) continue;

			switch (p.tokenType?.tokenName) {
				case "Period":
				case "Dot": {
					if (token.startColumn == 1) {
						result.push(token);
					}
				}
			}
		}

		return result;
	}
}
