import * as vscode from 'vscode';
import * as path from 'path';
import * as n3 from 'n3';
import { OwlReasoner, StoreFactory } from '@faubulous/mentor-rdf';

export class VocabularyContext {
	/**
	 * The N3 store for the document.
	 */
	readonly store: n3.Store;

	/**
	 * The document.
	 */
	readonly document: vscode.TextDocument;

	/**
	 * All namespaces defined in the document.
	 */
	readonly namespaces: { [key: string]: string } = {};

	/**
	 * Maps resource URIs to indexed tokens.
	 */
	readonly tokens: { [key: string]: n3.Token[] } = {};

	constructor(document: vscode.TextDocument, store: n3.Store) {
		this.document = document;
		this.store = store;

		this._parseTokens(document);
	}

	private _parseTokens(document: vscode.TextDocument): void {
		const text = document.getText();
		const tokens = new n3.Lexer().tokenize(text);

		tokens.forEach((t, i) => {
			if (!t.value) {
				return;
			}

			let v = t.value;

			switch (t.type) {
				case 'prefix': {
					let u = tokens[i + 1].value;

					if (u) {
						this.namespaces[v] = u;
					}

					break;
				}
				case 'prefixed': {
					if (t.prefix) {
						v = this.namespaces[t.prefix] + t.value;

						if (!this.tokens[v]) {
							this.tokens[v] = [];
						}

						this.tokens[v].push(t);
					}
					break;
				}
				case 'IRI': {
					if (!this.tokens[v]) {
						this.tokens[v] = [];
					}

					this.tokens[v].push(t);
					break;
				}
			}
		});
	}
}

class MentorExtension {
	/**
	 * Maps document URIs to loaded document contexts.
	 */
	contexts: { [key: string]: VocabularyContext } = {};

	/**
	 * The active document context.
	 */
	activeContext: VocabularyContext | undefined;

	private _onDidChangeDocumentContext = new vscode.EventEmitter<VocabularyContext | undefined>();

	readonly onDidChangeDocumentContext = this._onDidChangeDocumentContext.event;

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

		if (!this._canLoadDocument(editor.document.uri)) {
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
		if (!this._canLoadDocument(e.document.uri)) {
			return;
		}

		this._loadDocument(e.document, true).then((context) => {
			if (context) {
				this._onDidChangeDocumentContext?.fire(context);
			}
		});
	}

	/**
	 * Indicates whether a document with the given URI can be loaded.
	 * @param uri A document URI.
	 * @returns <c>true</c> if the document can be loaded, <c>false</c> otherwise.
	 */
	private _canLoadDocument(uri: vscode.Uri): boolean {
		if (!uri || uri.scheme !== 'file') {
			return false;
		}

		const ext = path.extname(uri.fsPath);

		return ext === '.ttl' || ext === '.nt';
	}

	private async _loadDocument(document: vscode.TextDocument, reload: boolean): Promise<VocabularyContext | undefined> {
		if (!document) {
			return;
		}

		const uri = document.uri.toString();

		let context = this.contexts[uri];

		if (context && !reload) {
			return context;
		}

		const store = await StoreFactory.createFromStream(document.getText(), uri);

		new OwlReasoner().expand(store, uri, uri + "#inference");

		context = new VocabularyContext(document, store);

		this.contexts[uri] = context;
		this.activeContext = context;

		return context;
	}
}

export const mentor: MentorExtension = new MentorExtension();