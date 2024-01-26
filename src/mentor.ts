import * as vscode from 'vscode';
import { DocumentContext } from './document-context';
import { Store, OwlReasoner, OntologyRepository } from '@faubulous/mentor-rdf';

class MentorExtension {
	/**
	 * Maps document URIs to loaded document contexts.
	 */
	contexts: { [key: string]: DocumentContext<OntologyRepository> } = {};

	/**
	 * The active document context.
	 */
	activeContext: DocumentContext<OntologyRepository> | undefined;

	/**
	 * The triple store.
	 */
	store = new Store(new OwlReasoner());

	/**
	 * The ontology repository.
	 */
	repository = new OntologyRepository(this.store);

	private _onDidChangeDocumentContext = new vscode.EventEmitter<DocumentContext<OntologyRepository> | undefined>();

	readonly onDidChangeVocabularyContext = this._onDidChangeDocumentContext.event;

	constructor() {
		vscode.workspace.onDidChangeTextDocument((e) => this.onTextDocumentChanged(e));
		vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());

		this.store.loadFrameworkOntologies().then(() => {});

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

	private async _loadDocument(document: vscode.TextDocument, reload: boolean = false): Promise<DocumentContext<OntologyRepository> | undefined> {
		if (!document) {
			return;
		}

		const uri = document.uri.toString();

		let context = this.contexts[uri];

		if (context && !reload) {
			return context;
		}

		context = new DocumentContext(document, this.store, this.repository);

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
}

export const mentor: MentorExtension = new MentorExtension();