import * as vscode from 'vscode';
import * as n3 from 'n3';
import { OwlReasoner, StoreFactory, RdfSyntax, Tokenizer, TokenizerResult, rdf } from '@faubulous/mentor-rdf';
import { IToken } from 'millan';

export class DocumentContext {
	private _store: n3.Store | undefined;

	/**
	 * The N3 store for the document.
	 */
	get store(): n3.Store | undefined { return this._store; };

	/**
	 * The document.
	 */
	readonly document: vscode.TextDocument;

	/**
	 * All namespaces defined in the document.
	 */
	readonly namespaces: { [key: string]: string } = {};

	/**
	 * All tokens in the document.
	 */
	readonly tokens: IToken[] = [];

	/**
	 * Maps resource URIs to indexed tokens.
	 */
	readonly typeAssertions: { [key: string]: IToken[] } = {};

	/**
	 * Maps resource URIs to indexed tokens.
	 */
	readonly references: { [key: string]: IToken[] } = {};

	constructor(document: vscode.TextDocument) {
		this.document = document;
	}

	public static canLoad(document: vscode.TextDocument): boolean {
		return document && (this._isSupportedGraphLanguage(document.languageId) || this._isSupportedQueryLanguage(document.languageId));
	}

	private static _isSupportedGraphLanguage(languageId: string): boolean {
		switch (languageId) {
			case 'ntriples':
			case 'nquads':
			case 'turtle':
			case 'trig':
				return true;
			default:
				return false;
		}
	}

	private static _isSupportedQueryLanguage(languageId: string): boolean {
		switch (languageId) {
			case 'sparql':
				return true;
			default:
				return false;
		}
	}

	public async load(document: vscode.TextDocument): Promise<void> {
		if (!DocumentContext.canLoad(document)) {
			return;
		}

		await Promise.all([
			this._parseGraph(document),
			this._parseTokens(document)
		])
	}

	private async _parseGraph(document: vscode.TextDocument): Promise<void> {
		if (DocumentContext._isSupportedGraphLanguage(document.languageId)) {
			const uri = document.uri.toString();

			try {
				this._store = await StoreFactory.createFromStream(document.getText(), uri);

				new OwlReasoner().expand(this._store, uri, uri + "#inference");
			} catch (e) {
				console.error(e);
			}
		}
	}

	private async _parseTokens(document: vscode.TextDocument): Promise<void> {
		const data = document.getText();
		let result: TokenizerResult;

		if (DocumentContext._isSupportedQueryLanguage(document.languageId)) {
			result = await Tokenizer.parseData(data, RdfSyntax.Sparql);
		} else {
			result = await Tokenizer.parseData(data, RdfSyntax.TriG);
		}

		this.tokens.length = 0;
		this.tokens.push(...result.tokens);

		result.tokens.forEach((t, i) => {
			switch (t.tokenType?.tokenName) {
				case 'PNAME_NS': {
					const prefix = t.image.substring(0, t.image.length - 1);
					const uri = this._getUriFromToken(result.tokens[i + 1]);

					if (uri) {
						this.namespaces[prefix] = uri;
					}

					break;
				}
				case 'PNAME_LN': {
					const uri = this._getUriFromPrefixedName(t.image);

					if (!uri) break;

					this._handleTypeAssertion(result, t, uri, i);
					this._handleUriReference(result, t, uri);
					break;
				}
				case 'IRIREF': {
					const uri = t.image.substring(1, t.image.length - 1);

					this._handleTypeAssertion(result, t, uri, i);
					this._handleUriReference(result, t, uri);
					break;
				}
				case 'A': {
					this._handleTypeAssertion(result, t, rdf.type.id, i);
					break;
				}
			}
		});
	}

	private _getUriFromToken(token: IToken): string | undefined {
		if (token.tokenType?.tokenName === 'IRIREF') {
			return this._getUriFromIriReference(token.image);
		} else if (token.tokenType?.tokenName === 'PNAME_LN') {
			return this._getUriFromPrefixedName(token.image);
		}
	}

	private _getUriFromIriReference(value: string): string {
		const v = value.trim();

		if (v.length > 2 && v.startsWith('<') && v.endsWith('>')) {
			return v.substring(1, v.length - 1);
		} else {
			return v;
		}
	}

	private _getUriFromPrefixedName(name: string): string | undefined {
		const parts = name.split(':');

		if (parts.length != 2) {
			return;
		}

		const prefix = parts[0];
		const label = parts[1];

		if (!this.namespaces[prefix]) {
			return;
		}

		return this.namespaces[prefix] + label;
	}

	private _handleUriReference(result: TokenizerResult, token: IToken, uri: string) {
		if (!this.references[uri]) {
			this.references[uri] = [];
		}

		this.references[uri].push(token);
	}

	private _handleTypeAssertion(result: TokenizerResult, token: IToken, uri: string, index: number) {
		if (uri != rdf.type.id) return;

		const s = result.tokens[index - 1];

		if (!s) return;

		const u = this._getUriFromToken(s);

		if (!u) return;

		this.typeAssertions[u] = [s];
	}
}

class MentorExtension {
	/**
	 * Maps document URIs to loaded document contexts.
	 */
	contexts: { [key: string]: DocumentContext } = {};

	/**
	 * The active document context.
	 */
	activeContext: DocumentContext | undefined;

	private _onDidChangeDocumentContext = new vscode.EventEmitter<DocumentContext | undefined>();

	readonly onDidChangeVocabularyContext = this._onDidChangeDocumentContext.event;

	constructor() {
		vscode.workspace.onDidChangeTextDocument((e) => this.onTextDocumentChanged(e));
		vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());

		this.onActiveEditorChanged();
	}

	onActiveEditorChanged(): void {
		if (!vscode.window.activeTextEditor) {
			return;
		}

		const editor = vscode.window.activeTextEditor;

		if (editor.document == this.activeContext?.document) {
			return;
		}

		if (!DocumentContext.canLoad(editor.document)) {
			return;
		}

		this._loadDocument(editor.document).then((context) => {
			if (context) {
				this.activeContext = context;
				this._onDidChangeDocumentContext?.fire(context);
			}
		});
	}

	onTextDocumentChanged(e: vscode.TextDocumentChangeEvent): void {
		if (!DocumentContext.canLoad(e.document)) {
			return;
		}

		this._loadDocument(e.document, true).then((context) => {
			if (context) {
				this._onDidChangeDocumentContext?.fire(context);
			}
		});
	}

	private async _loadDocument(document: vscode.TextDocument, reload: boolean = false): Promise<DocumentContext | undefined> {
		if (!document) {
			return;
		}

		const uri = document.uri.toString();

		let context = this.contexts[uri];

		if (context && !reload) {
			return context;
		}

		context = new DocumentContext(document);

		await context.load(document);

		this.contexts[uri] = context;
		this.activeContext = context;

		return context;
	}
}

export const mentor: MentorExtension = new MentorExtension();