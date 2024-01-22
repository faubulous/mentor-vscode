import * as vscode from 'vscode';
import * as n3 from 'n3';
import { OwlReasoner, StoreFactory, RdfSyntax, Tokenizer, TokenizerResult, rdf, skos, rdfs } from '@faubulous/mentor-rdf';
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
	readonly namespaceDefinitions: { [key: string]: IToken } = {};

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
				const text = document.getText();

				const options = { reasoner: new OwlReasoner() };
				this._store = await StoreFactory.createFromStream(text, uri, options);

				let graph = "";

				for (let q of this._store.readQuads(null, null, null, uri + "#inference")) {
					graph += `<${q.subject.value}> <${q.predicate.value}> <${q.object.value}> .\n`;
				}
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

					if (!uri) break;

					this.namespaces[prefix] = uri;
					this.namespaceDefinitions[uri] = t;
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
					const uri = this._getUriFromIriReference(t.image);

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

	public getResourceDescription(subjectUri: string): string | undefined {
		const predicates = [skos.definition, rdfs.comment];
		const s = new n3.NamedNode(subjectUri);

		for (let p of predicates) {
			const o = this.store?.getObjects(s, p, null) ?? [];

			for (let d of o) {
				return d.value;
			}
		}
	}

	public getResourceTooltip(subjectUri: string): vscode.MarkdownString {
		let result = this.getResourceDescription(subjectUri) ?? '';

		if (result) {
			result += '\n\n';
		}

		result += subjectUri;

		return new vscode.MarkdownString(result, true);
	}

	/**
	 * Gets all tokens at a given position.
	 * @param position A position in the document.
	 * @returns An non-empty array of tokens on success, an empty array otherwise.
	 */
	public getTokensAtPosition(position: vscode.Position): IToken[] {
		// The tokens are 0-based, but the position is 1-based.
		const l = position.line + 1;
		const n = position.character + 1;

		return this.tokens.filter(t =>
			t.startLine &&
			t.startLine <= l &&
			t.endLine &&
			t.endLine >= l &&
			t.startColumn &&
			t.startColumn <= n &&
			t.endColumn &&
			t.endColumn >= (n - 1)
		);
	}

	public getUriFromToken(token: IToken): string | undefined {
		if (token.tokenType?.tokenName === 'IRIREF') {
			return this._getUriFromIriReference(token.image);
		} else if (token.tokenType?.tokenName === 'PNAME_LN') {
			return this._getUriFromPrefixedName(token.image);
		}
	}

	public updateNamespacePrefix(oldPrefix: string, newPrefix: string) {
		const uri = this.namespaces[oldPrefix];

		if (!uri) return;

		delete this.namespaces[oldPrefix];

		this.namespaces[newPrefix] = uri;
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

	private _onDidChangeClassFilter = new vscode.EventEmitter<{ classUri: string | undefined }>();

	readonly onDidChangeClassFilter = this._onDidChangeClassFilter.event;

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

		for (let d of Object.values(this.contexts).filter(c => c.document.isClosed)) {
			const uri = d.document.uri.toString();

			delete this.contexts[uri];
		}

		return context;
	}

	async activateDocument(): Promise<vscode.TextEditor | undefined> {
		const activeTextEditor = vscode.window.activeTextEditor;

		if (this.activeContext && this.activeContext.document != activeTextEditor?.document) {
			await vscode.commands.executeCommand<vscode.TextDocumentShowOptions>("vscode.open", this.activeContext.document.uri);
		}

		return activeTextEditor;
	}

	/**
	 * Applies filtering in views to only show properties and individuals related to the class.
	 * @param classUri URI of a class. Set to undefined to reset the filter.
	 */
	filterByClass(classUri: string | undefined) {
		this._onDidChangeClassFilter.fire({ classUri });
	}
}

export const mentor: MentorExtension = new MentorExtension();