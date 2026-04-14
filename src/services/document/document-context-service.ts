import * as vscode from 'vscode';
import { Store, VocabularyRepository } from '@faubulous/mentor-rdf';
import { IToken } from '@faubulous/mentor-rdf-parsers';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { IDocumentFactory } from '@src/services/document/document-factory.interface';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { getConfig } from '@src/utilities/vscode/config';

/**
 * Maps document URIs to loaded document contexts.
 */
export interface DocumentIndex {
	[key: string]: IDocumentContext;
}

/**
 * Manages document contexts and coordinates token delivery from language servers.
 * This is the central service for loading, tracking, and retrieving RDF document contexts.
 */
export class DocumentContextService {
	private readonly _convertTargetLanguageIds = ['ntriples', 'nquads', 'turtle', 'xml'];

	/**
	 * Maps document URIs to loaded document contexts.
	 */
	readonly contexts: DocumentIndex = {};

	/**
	 * The currently active document context or `undefined`.
	 */
	activeContext: IDocumentContext | undefined;

	/**
	 * A map of pending token requests keyed by document URI.
	 * Used to coordinate between loadDocument and language server token delivery.
	 */
	private readonly _pendingTokenRequests = new Map<string, {
		resolve: (tokens: IToken[]) => void;
		reject: (error: Error) => void;
	}>();

	/**
	 * One-shot listeners waiting for the next token delivery for a given URI.
	 * Used by feature providers to sync with the language server without blocking 
	 * document loading.
	 */
	private readonly _nextTokenListeners = new Map<string, Array<{
		resolve: (tokens: IToken[]) => void;
		reject: (error: Error) => void;
	}>>();

	/**
	 * Tracks the current load generation per URI. Incremented each time 
	 * a new load starts for a URI, allowing older loads to detect
	 * they have been superseded and should abandon their work.
	 */
	private readonly _tokenLoadGeneration = new Map<string, number>();

	/**
	 * Default timeout in milliseconds for waiting for tokens from the language server.
	 */
	private readonly _tokenWaitTimeout = 10000;

	private readonly _onDidChangeDocumentContext = new vscode.EventEmitter<IDocumentContext | undefined>();

	/**
	 * An event that is fired after the active document context has changed.
	 */
	readonly onDidChangeDocumentContext = this._onDidChangeDocumentContext.event;

	constructor(
		private readonly _extensionContext: vscode.ExtensionContext,
		private readonly _store: Store,
		private readonly _vocabulary: VocabularyRepository,
		private readonly _documentFactory: IDocumentFactory
	) {
		// Register event handlers for editor and document changes.
		this._extensionContext.subscriptions.push(...[
			vscode.window.onDidChangeActiveTextEditor(() => this.handleActiveEditorChanged()),
			vscode.window.onDidChangeActiveNotebookEditor((e) => this.handleActiveNotebookEditorChanged(e)),
			vscode.workspace.onDidChangeTextDocument((e) => this.handleTextDocumentChanged(e)),
			vscode.workspace.onDidCloseTextDocument((e) => this.handleDocumentClosed(e)),
			this._onDidChangeDocumentContext,
			this
		]);

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
		this._tokenLoadGeneration.clear();
	}

	/**
	 * Get the document context from a URI.
	 * @param uri A document or workspace URI.
	 * @returns A document context if the document is loaded, `undefined` otherwise.
	 */
	getDocumentContextFromUri(uri: string): IDocumentContext | undefined {
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
	getDocumentContext<T extends IDocumentContext>(document: vscode.TextDocument, contextType: new (...args: any[]) => T): T | null {
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
	 * If a previous wait exists for the same URI, it is cancelled (rejected) first
	 * so that only one load at a time can be waiting for tokens per URI.
	 * @param uri The document URI to wait for tokens.
	 * @param timeout Optional timeout in milliseconds (defaults to _tokenWaitTimeout).
	 * @returns A promise that resolves with the tokens or rejects on timeout/cancellation.
	 */
	waitForTokens(uri: string, timeout?: number): Promise<IToken[]> {
		// Cancel any existing pending request for this URI to prevent multiple
		// concurrent loads from racing against each other.
		this._cancelPendingTokenRequest(uri);

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
	 * Returns a promise that resolves with the next token delivery from the language server for the given URI.
	 * This is a one-shot listener; it does not cancel or interfere with any pending loadDocument request.
	 * @param uri The document URI.
	 * @param timeout Timeout in milliseconds.
	 * @returns A promise that resolves with the tokens or rejects on timeout.
	 */
	onNextTokenDelivery(uri: string, timeout: number): Promise<IToken[]> {
		return new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				const listeners = this._nextTokenListeners.get(uri);

				if (listeners) {
					const idx = listeners.findIndex(l => l.resolve === resolve);

					if (idx >= 0) listeners.splice(idx, 1);
					if (listeners.length === 0) this._nextTokenListeners.delete(uri);
				}

				reject(new Error(`Timeout waiting for next token delivery for: ${uri}`));
			}, timeout);

			const entry = {
				resolve: (tokens: IToken[]) => { clearTimeout(timeoutId); resolve(tokens); },
				reject: (error: Error) => { clearTimeout(timeoutId); reject(error); }
			};

			const existing = this._nextTokenListeners.get(uri);

			if (existing) {
				existing.push(entry);
			} else {
				this._nextTokenListeners.set(uri, [entry]);
			}
		});
	}

	/**
	 * Cancel any pending token request for the given URI.
	 * This rejects the existing promise, which causes any `loadDocument` awaiting it
	 * to enter its catch block and detect that it has been superseded.
	 * @param uri The document URI.
	 */
	private _cancelPendingTokenRequest(uri: string): void {
		const pending = this._pendingTokenRequests.get(uri);

		if (pending) {
			pending.reject(new Error('Load superseded by a newer request'));
		}
	}

	/**
	 * Resolve pending token requests for a document. Called by language clients when tokens arrive.
	 * If no pending request exists but the context is already loaded, reloads the triples
	 * to ensure the context stays in sync with the latest tokens.
	 * @param uri The document URI.
	 * @param tokens The tokens from the language server.
	 */
	resolveTokens(uri: string, tokens: IToken[]): void {
		// Notify one-shot listeners (e.g. completion providers waiting for fresh tokens).
		const listeners = this._nextTokenListeners.get(uri);

		if (listeners?.length) {
			for (const listener of listeners) {
				listener.resolve(tokens);
			}

			this._nextTokenListeners.delete(uri);
		}

		const pending = this._pendingTokenRequests.get(uri);

		if (pending) {
			pending.resolve(tokens);
			return;
		}

		// Tokens arrived but no load was waiting for them. This is the normal path
		// for document edits: handleTextDocumentChanged does not trigger a loadDocument,
		// so when the language server sends updated tokens there is no pending waiter.
		// Reload the triples to bring the context up to date.
		const context = this.contexts[uri];

		if (context?.hasTokens) {
			this._reloadContextTriples(uri).catch(e => {
				console.warn('Mentor: Failed to reload context after token delivery:', e);
			});
		}
	}

	/**
	 * Reload triples on an existing context using its current tokens and the latest document content.
	 * Called when the language server delivers updated tokens for an already-loaded document.
	 * @param uri The document URI.
	 */
	private async _reloadContextTriples(uri: string): Promise<void> {
		const context = this.contexts[uri];

		if (!context?.hasTokens) return;

		const doc = vscode.workspace.textDocuments.find(d => d.uri.toString() === uri);

		if (!doc) return;

		await context.loadTriples(doc.getText());
		await context.infer();

		// Verify the context wasn't replaced during the async operations.
		if (this.contexts[uri] !== context) return;

		context.predicateStats = this._vocabulary.getPredicateUsageStats(context.graphs);
		context.activeLanguageTag = getConfig().get('definitionTree.defaultLanguageTag', context.primaryLanguage);

		if (this.activeContext?.uri.toString() === uri) {
			this.activeContext = context;
			this._onDidChangeDocumentContext.fire(context);
		}
	}

	/**
	 * Get the document context from a file or workspace URI.
	 * @param uri A document or workspace URI.
	 * @returns A document context if the document is loaded, `undefined` otherwise.
	 */
	getContextFromUri(uri: string): IDocumentContext | undefined {
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
	getContext<T extends IDocumentContext>(document: vscode.TextDocument, contextType: new (...args: any[]) => T): T | null {
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
	 * @returns A promise that resolves to the document context or undefined if superseded/unsupported.
	 */
	async loadDocument(document: vscode.TextDocument, forceReload: boolean = false): Promise<IDocumentContext | undefined> {
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

		// Increment the load generation for this URI. This invalidates any concurrent
		// load that may be in progress (awaiting tokens or loading triples).
		const generation = (this._tokenLoadGeneration.get(uri) ?? 0) + 1;
		
		this._tokenLoadGeneration.set(uri, generation);

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
				// If this load was superseded by a newer one, abandon silently.
				if (this._tokenLoadGeneration.get(uri) !== generation) {
					return;
				}

				// Timeout waiting for tokens - this can happen if the language server is slow
				// or not responding or if the document simply does not contain any tokens (e.g. empty document). 
				// In this case, we proceed with loading the document without tokens, and log a warning.
				const message = e instanceof Error ? e.message : String(e);

				console.debug(`Mentor: Timeout waiting for tokens: ${uri}`, message);

				return context;
			}
		}

		// Check if this load was superseded after awaiting tokens.
		if (this._tokenLoadGeneration.get(uri) !== generation) {
			return;
		}

		// Tokens available, load triples into store.
		await context.loadTriples(content);

		// Check if this load was superseded after loading triples.
		if (this._tokenLoadGeneration.get(uri) !== generation) {
			return;
		}

		// Compute the inference graph on the document to simplify querying.
		await context.infer();

		// Final supersession check after all async work is done.
		if (this._tokenLoadGeneration.get(uri) !== generation) {
			return;
		}

		// Set the language tag statistics for the document, needed for rendering multi-language labels.
		context.predicateStats = this._vocabulary.getPredicateUsageStats(context.graphs);

		// We default to the user choice of the primary language tag as there might be multiple languages in the document.
		context.activeLanguageTag = getConfig().get('definitionTree.defaultLanguageTag', context.primaryLanguage);

		this.contexts[uri] = context;

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

		if (!editor) {
			await this._setConvertFileFormatContexts();
			return;
		}

		const uri = editor.document.uri;

		if (!uri) {
			await this._setConvertFileFormatContexts();
			return;
		}

		await this._setConvertFileFormatContexts(editor.document.languageId, uri.toString());

		if (uri === this.activeContext?.uri) return;

		const context = await this.loadDocument(editor.document);

		if (context) {
			this.activeContext = context;
			this._onDidChangeDocumentContext.fire(context);
		}

		// For XML, isRdfDocument could not be determined from the language ID alone;
		// update it now that loading is complete.
		if (editor.document.languageId === 'xml') {
			await vscode.commands.executeCommand('setContext', 'mentor.editor.isRdfDocument', context?.isLoaded === true);
		}
	}

	/**
	 * Set the context for convert file format commands based on the current language ID to 
	 * support menu visibility and enablement of conversion related commands.
	 * @param languageId The language ID of the current document. If `undefined`, all convert file format contexts will be set to `false`.
	 * @returns A promise that resolves when the contexts have been set.
	 */
	private async _setConvertFileFormatContexts(languageId?: string, uri?: string): Promise<void> {
		const targets = new Set(languageId ? this._documentFactory.getConvertibleTargetLanguageIds(languageId) : []);
		const convertible = languageId ? this._documentFactory.isConvertibleLanguage(languageId) : false;

		// For non-XML triple-source languages the language ID is unambiguous.
		// For XML the language ID is shared with plain XML documents, so we only
		// confirm it is RDF/XML once the document context has been successfully loaded.
		const isTripleSource = languageId ? this._documentFactory.isTripleSourceLanguage(languageId) : false;
		const isRdfDocument = isTripleSource && (languageId !== 'xml' || (uri !== undefined && this.contexts[uri]?.isLoaded === true));

		await vscode.commands.executeCommand('setContext', 'mentor.command.convertFileFormat.executable', convertible);
		await vscode.commands.executeCommand('setContext', 'mentor.editor.isRdfDocument', isRdfDocument);

		for (const targetLanguageId of this._convertTargetLanguageIds) {
			await vscode.commands.executeCommand(
				'setContext',
				`mentor.command.convertFileFormat.target.${targetLanguageId}`,
				targets.has(targetLanguageId)
			);
		}
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
	 * Handle text document changed event. Does not trigger a full document reload. 
	 * Instead, the existing contextis kept visible and the reload happens when the 
	 * language server delivers updated tokens via resolveTokens → _reloadContextTriples.
	 * @param e The text document change event.
	 */
	async handleTextDocumentChanged(e: vscode.TextDocumentChangeEvent): Promise<void> {
		if (!this._documentFactory.supportedLanguages.has(e.document.languageId)) return;

		const uri = e.document.uri.toString();
		let context = this.contexts[uri];

		if (!context) {
			// No context exists yet — create one so the language client notification
			// handler can find it and set tokens on it.
			context = this._documentFactory.create(e.document.uri, e.document.languageId);
			
			this.contexts[uri] = context;
		}

		// Notify the context for immediate lightweight reactions (e.g. auto-prefix).
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

			// Also delete the graphs in the store to free up memory.
			this._store.deleteGraphs(context.graphs);
		}
	}
}
