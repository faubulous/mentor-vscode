import * as vscode from 'vscode';
import { IToken } from 'millan';
import { mentor } from '@/mentor';
import { DocumentContext } from '@/document-context';
import { getPreviousToken, getIriFromToken } from '@/utilities';
import { ReferenceProvider } from './reference-provider';

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

				// Fire the event to refresh the code lenses.
				this._onDidChangeCodeLenses.fire();
			}
		});
	}

	private async _initialize() {
		this._initializing = true;
		this._initialized = false;

		this._enabled = mentor.configuration.get('editor.codeLensEnabled', true);

		mentor.workspaceIndexer.waitForIndexed().then(() => {
			if (this._enabled) {
				this._onDidChangeCodeLenses.fire();
			}
		});

		mentor.onDidChangeVocabularyContext(() => {
			if (this._enabled) {
				this._onDidChangeCodeLenses.fire();
			}
		});

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

			// TODO: Refactor getSubjects into DocumentContext and overload for different languages.
			for (let subject of this.getSubjects(context)) {
				let uri = getIriFromToken(context.namespaces, subject);

				if (!uri) continue;

				// The references include the subject itself, so we subtract 1.
				let n = Math.max(this.provideReferencesForIri(uri).length - 1, 0);
				let range = this.getRangeFromToken(subject);

				result.push(new vscode.CodeLens(range, {
					command: 'mentor.action.findReferences',
					title: n + ' usages',
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
