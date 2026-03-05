import * as vscode from 'vscode';
import { IToken } from 'chevrotain';
import { VocabularyRepository } from '@faubulous/mentor-rdf';
import { DocumentContext } from '@src/workspace/document-context';
import { DocumentFactory } from '@src//workspace/document-factory';
import { WorkspaceUri } from '@src/workspace/workspace-uri';
import { IConfigurationService } from '@src/services';

/**
 * Maps document URIs to loaded document contexts.
 */
export interface DocumentIndex {
	[key: string]: DocumentContext;
}

/**
 * Manages document contexts and coordinates token delivery from language servers.
 * This is the central service for loading, tracking, and retrieving RDF document contexts.
 */
export class DocumentContextService {
	/**
	 * Maps document URIs to loaded document contexts.
	 */
	readonly contexts: DocumentIndex = {};

	/**
	 * The currently active document context or `undefined`.
	 */
	activeContext: DocumentContext | undefined;

	/**
	 * A map of pending token requests keyed by document URI.
	 * Used to coordinate between loadDocument and language server token delivery.
	 */
	private readonly _pendingTokenRequests = new Map<string, {
		resolve: (tokens: IToken[]) => void;
		reject: (error: Error) => void;
	}>();

	/**
	 * Default timeout in milliseconds for waiting for tokens from the language server.
	 */
	private readonly _tokenWaitTimeout = 5000;

	private readonly _onDidChangeDocumentContext = new vscode.EventEmitter<DocumentContext | undefined>();

	/**
	 * An event that is fired after the active document context has changed.
	 */
	readonly onDidChangeDocumentContext = this._onDidChangeDocumentContext.event;

	constructor(
		private readonly _extensionContext: vscode.ExtensionContext,
		private readonly _vocabulary: VocabularyRepository,
		private readonly _documentFactory: DocumentFactory,
		private readonly _configurationProvider: IConfigurationService
	) {
		// Register event handlers for editor and document changes.
		const disposables = [
			this._onDidChangeDocumentContext,
			vscode.window.onDidChangeActiveTextEditor(() => this.handleActiveEditorChanged()),
			vscode.window.onDidChangeActiveNotebookEditor((e) => this.handleActiveNotebookEditorChanged(e)),
			vscode.workspace.onDidChangeTextDocument((e) => this.handleTextDocumentChanged(e)),
			vscode.workspace.onDidCloseTextDocument((e) => this.handleDocumentClosed(e))
		];

		this._extensionContext.subscriptions.push(...disposables);

		// If there is an active editor on startup, load its document and set the active context.
		this.handleActiveEditorChanged().then(() => {
			this.activateDocument();
		});
	}

	/**
	 * Dispose the manager and clean up resources.
	 */
	dispose(): void {
		// Reject any pending token requests
		for (const [, pending] of this._pendingTokenRequests) {
			pending.reject(new Error('DocumentContextService disposed'));
		}

		this._pendingTokenRequests.clear();
	}

	/**
	 * Get the document context from a URI.
	 * @param uri A document or workspace URI.
	 * @returns A document context if the document is loaded, `undefined` otherwise.
	 */
	getDocumentContextFromUri(uri: string): DocumentContext | undefined {
		if (uri.startsWith(WorkspaceUri.uriScheme)) {
			const u = WorkspaceUri.toFileUri(vscode.Uri.parse(uri)).toString();
			return this.contexts[u];
		} else {
			return this.contexts[uri];
		}
	}

	/**
	 * Get the document context from a text document.
	 * @param document A text document.
	 * @param contextType The expected type of the document context.
	 * @returns A document context of the specified type if the document is loaded and matches the type, null otherwise.
	 */
	getDocumentContext<T extends DocumentContext>(document: vscode.TextDocument, contextType: new (...args: any[]) => T): T | null {
		const uri = document.uri.toString();

		if (!this.contexts[uri]) {
			return null;
		}

		const context = this.contexts[uri];

		if (!(context instanceof contextType)) {
			return null;
		}

		return context as T;
	}

	/**
	 * Wait for tokens to be delivered from the language server for a document.
	 * @param uri The document URI to wait for tokens.
	 * @param timeout Optional timeout in milliseconds (defaults to _tokenWaitTimeout).
	 * @returns A promise that resolves with the tokens or rejects on timeout.
	 */
	waitForTokens(uri: string, timeout?: number): Promise<IToken[]> {
		const existingRequest = this._pendingTokenRequests.get(uri);

		if (existingRequest) {
			// Already waiting for this document
			return new Promise((resolve, reject) => {
				const originalResolve = existingRequest.resolve;
				const originalReject = existingRequest.reject;

				existingRequest.resolve = (tokens) => {
					originalResolve(tokens);
					resolve(tokens);
				};

				existingRequest.reject = (error) => {
					originalReject(error);
					reject(error);
				};
			});
		}

		return new Promise((resolve, reject) => {
			const timeoutMs = timeout ?? this._tokenWaitTimeout;

			const timeoutId = setTimeout(() => {
				this._pendingTokenRequests.delete(uri);
				reject(new Error(`Timeout waiting for tokens from language server for: ${uri}`));
			}, timeoutMs);

			this._pendingTokenRequests.set(uri, {
				resolve: (tokens) => {
					clearTimeout(timeoutId);
					this._pendingTokenRequests.delete(uri);
					resolve(tokens);
				},
				reject: (error) => {
					clearTimeout(timeoutId);
					this._pendingTokenRequests.delete(uri);
					reject(error);
				}
			});
		});
	}

	/**
	 * Resolve pending token requests for a document. Called by language clients when tokens arrive.
	 * @param uri The document URI.
	 * @param tokens The tokens from the language server.
	 */
	resolveTokens(uri: string, tokens: IToken[]): void {
		const pending = this._pendingTokenRequests.get(uri);

		if (pending) {
			pending.resolve(tokens);
		}
	}

	/**
	 * Get the document context from a file or workspace URI.
	 * @param uri A document or workspace URI.
	 * @returns A document context if the document is loaded, `undefined` otherwise.
	 */
	getContextFromUri(uri: string): DocumentContext | undefined {
		if (uri.startsWith(WorkspaceUri.uriScheme)) {
			const u = WorkspaceUri.toFileUri(vscode.Uri.parse(uri)).toString();
			return this.contexts[u];
		} else {
			return this.contexts[uri];
		}
	}

	/**
	 * Get the document context from a text document.
	 * @param document A text document.
	 * @param contextType The expected type of the document context.
	 * @returns A document context of the specified type if the document is loaded and matches the type, null otherwise.
	 */
	getContext<T extends DocumentContext>(document: vscode.TextDocument, contextType: new (...args: any[]) => T): T | null {
		const uri = document.uri.toString();

		if (!this.contexts[uri]) {
			return null;
		}

		const context = this.contexts[uri];

		if (!(context instanceof contextType)) {
			return null;
		}

		return context as T;
	}

	/**
	 * Load a text document into a document context.
	 * @param document The text document to load.
	 * @param forceReload Indicates whether a new context should be created for existing contexts.
	 * @returns A promise that resolves to the document context or undefined if unsupported.
	 */
	async loadDocument(document: vscode.TextDocument, forceReload: boolean = false): Promise<DocumentContext | undefined> {
		if (!document || !this._documentFactory.supportedLanguages.has(document.languageId)) {
			return;
		}

		const uri = document.uri.toString();

		if (document.uri.scheme === 'vscode-notebook-cell') {
			console.log(document.uri);
		}

		let context = this.contexts[uri];

		if (context?.isLoaded && !forceReload) {
			// Compute the inference graph on the document, if it does not exist.
			context.infer();
			return context;
		}

		// Only create a new context if one doesn't exist or if force reloading.
		// This preserves tokens from early language server notifications.
		if (!context || forceReload) {
			context = this._documentFactory.create(document.uri, document.languageId);

			// Register context immediately so language client notification handlers can find it.
			this.contexts[uri] = context;
		}

		const content = document.getText();

		// Check if the context already has tokens (from language server notification that arrived early).
		// If not, wait for tokens from the language server.
		if (!context.hasTokens) {
			try {
				// Wait for tokens from the language server.
				await this.waitForTokens(uri);
			} catch (e) {
				// Timeout waiting for tokens - this can happen if the language server is slow
				// or not responding or if the document simply does not contain any tokens (e.g. empty document). 
				// In this case, we proceed with loading the document without tokens, and log a warning.
				const message = e instanceof Error ? e.message : String(e);

				console.warn(`Mentor: Timeout waiting for tokens: ${uri}`, message);

				return context;
			}
		}

		// Tokens available, load triples into store.
		await context.loadTriples(content);

		// Compute the inference graph on the document to simplify querying.
		await context.infer();

		// Set the language tag statistics for the document, needed for rendering multi-language labels.
		context.predicateStats = this._vocabulary.getPredicateUsageStats(context.graphs);

		// We default to the user choice of the primary language tag as there might be multiple languages in the document.
		context.activeLanguageTag = this._configurationProvider.get('definitionTree.defaultLanguageTag', context.primaryLanguage);

		this.contexts[uri] = context;

		// Only set the active context if it matches the active text editor document.
		const activeEditor = vscode.window.activeTextEditor;

		if (activeEditor && uri === activeEditor.document?.uri.toString()) {
			this.activeContext = context;
		}

		return context;
	}

	/**
	 * Activate the document associated with the active context in the editor.
	 * If the active context's document is not currently open in the editor, it will be opened.
	 * @returns A promise that resolves to the active text editor or `undefined`.
	 */
	async activateDocument(): Promise<vscode.TextEditor | undefined> {
		const documentUri = vscode.window.activeTextEditor?.document.uri;

		if (this.activeContext && this.activeContext.uri != documentUri) {
			await vscode.commands.executeCommand("vscode.open", this.activeContext.uri);
		}

		return vscode.window.activeTextEditor;
	}

	/**
	 * Handle active editor changed event.
	 * Loads the document and fires context changed event.
	 */
	async handleActiveEditorChanged(): Promise<void> {
		const editor = vscode.window.activeTextEditor;

		if (!editor) return;

		const uri = editor.document.uri;

		if (!uri || uri === this.activeContext?.uri) return;

		const context = await this.loadDocument(editor.document);

		if (context) {
			this.activeContext = context;

			this._onDidChangeDocumentContext.fire(context);
		}

		const convertible = this._documentFactory.isConvertibleLanguage(editor.document.languageId);

		vscode.commands.executeCommand("setContext", "mentor.command.convertFileFormat.executable", convertible);
	}

	/**
	 * Handle active notebook editor changed event.
	 * Loads all RDF cells in the notebook.
	 * @param editor The notebook editor.
	 */
	async handleActiveNotebookEditorChanged(editor: vscode.NotebookEditor | undefined): Promise<void> {
		if (!editor) return;

		// Load all RDF cells in the notebook to ensure their graphs are created.
		for (const cell of editor.notebook.getCells()) {
			if (this._documentFactory.isTripleSourceLanguage(cell.document.languageId)) {
				await this.loadDocument(cell.document);
			}
		}
	}

	/**
	 * Handle text document changed event.
	 * Reloads the document and fires context changed event.
	 * @param e The text document change event.
	 */
	async handleTextDocumentChanged(e: vscode.TextDocumentChangeEvent): Promise<void> {
		// Reload the document context when the document has changed.
		const context = await this.loadDocument(e.document, true);

		if (!context) return;

		// Update the active document context if it has changed.
		this.activeContext = context;

		this._onDidChangeDocumentContext.fire(context)

		context.onDidChangeDocument(e);
	}

	/**
	 * Handle text document closed event.
	 * @param document The closed text document.
	 */
	handleDocumentClosed(document: vscode.TextDocument): void {
		const uri = document.uri.toString();
		const context = this.contexts[uri];

		if (context && context.isTemporary) {
			// Cleanup temporary / non-persisted document context generated by views.
			delete this.contexts[uri];
		}
	}
}
