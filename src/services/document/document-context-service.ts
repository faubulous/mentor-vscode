import * as vscode from 'vscode';
import { Store, VocabularyRepository } from '@faubulous/mentor-rdf';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { IDocumentFactory } from '@src/services/document/document-factory.interface';
import { IDocumentTokenSource, TokenDelivery } from '@src/services/document/document-token-source.interface';
import { getMaxCellSlugNumber } from '@src/services/notebook/notebook-cell-slugs';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { getConfig } from '@src/utilities/vscode/config';
import { isTemplate } from 'triplate';
import { getLog } from '@src/utilities/vscode/log';
import { getErrorMessage } from '@src/utilities/error';

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

	private _contexts: DocumentIndex = {};

	/**
	 * Maps document URIs to loaded document contexts.
	 */
	get contexts(): DocumentIndex {
		return this._contexts;
	}

	/**
	 * The currently active document context or `undefined`.
	 */
	activeContext: IDocumentContext | undefined;

	private readonly _onDidChangeDocumentContext = new vscode.EventEmitter<IDocumentContext | undefined>();

	/**
	 * An event that is fired after the active document context has changed.
	 */
	readonly onDidChangeDocumentContext = this._onDidChangeDocumentContext.event;

	constructor(
		private readonly _extensionContext: vscode.ExtensionContext,
		private readonly _store: Store,
		private readonly _vocabulary: VocabularyRepository,
		private readonly _documentFactory: IDocumentFactory,
		private readonly _tokenSource: IDocumentTokenSource
	) {
		// Register event handlers for editor and document changes.
		this._extensionContext.subscriptions.push(...[
			vscode.window.onDidChangeActiveTextEditor(() => this.handleActiveEditorChanged()),
			vscode.window.onDidChangeTextEditorSelection((e) => this._setCursorOnResourceContext(e.textEditor)),
			this.onDidChangeDocumentContext(() => this._setCursorOnResourceContext(vscode.window.activeTextEditor)),
			vscode.window.onDidChangeActiveNotebookEditor((e) => this.handleActiveNotebookEditorChanged(e)),
			vscode.workspace.onDidChangeTextDocument((e) => this.handleTextDocumentChanged(e)),
			vscode.workspace.onDidChangeNotebookDocument((e) => this.handleNotebookDocumentChanged(e)),
			vscode.workspace.onDidCloseTextDocument((e) => this.handleDocumentClosed(e)),
			this._tokenSource.onDidDeliverTokens((delivery) => this._handleTokenDelivery(delivery)),
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
		// The event emitter and subscriptions are disposed via the extension
		// context subscriptions registered in the constructor.
	}

	/**
	 * Handles a token delivery from the token source. When the delivery was not
	 * consumed by a waiting document load, this is the normal path for document
	 * edits: reload the triples of an already-loaded context to bring it up to
	 * date with the latest tokens.
	 * @param delivery The token delivery.
	 */
	private _handleTokenDelivery(delivery: TokenDelivery): void {
		if (delivery.consumed) {
			return;
		}

		const context = this.contexts[delivery.uri];

		if (context?.isParsed) {
			this._reloadContextTriples(delivery.uri).catch(e => {
				getLog().warn('Failed to reload context after token delivery:', e);
			});
		}
	}

	/**
	 * Clear all loaded document contexts. Used when re-indexing the workspace to reset state.
	 */
	clear(): void {
		this._contexts = {};
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
	 * Reload triples on an existing context using its current tokens and the latest document content.
	 * Called when the language server delivers updated tokens for an already-loaded document.
	 * @param uri The document URI.
	 */
	private async _reloadContextTriples(uri: string): Promise<void> {
		const context = this.contexts[uri];

		if (!context?.isParsed) return;

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
	 * @param slug Optional slug to assign to the context before triples are loaded. This ensures
	 * the graph IRI uses the human-readable slug from the start (important for notebook cells).
	 * @returns A promise that resolves to the document context or undefined if superseded/unsupported.
	 */
	async loadDocument(document: vscode.TextDocument, forceReload: boolean = false, slug?: string): Promise<IDocumentContext | undefined> {
		if (!document || !this._documentFactory.supportedLanguages.has(document.languageId)) {
			return;
		}

		const uri = document.uri.toString();

		let context = this.contexts[uri];

		if (context?.isLoaded && !forceReload) {
			// If a slug is provided and differs from the current slug, update it now and
			// trigger a reload so the triples are stored under the correct graph IRI.
			// This handles the race where handleActiveEditorChanged loaded the cell without
			// a slug before the workspace indexer ran.
			if (slug !== undefined && context.slug !== slug) {
				context.slug = slug;

				this._reloadContextTriples(uri).catch(e => {
					getLog().warn('Failed to reload context after slug update:', e);
				});
			}

			// Compute the inference graph on the document, if it does not exist.
			context.infer();
			
			return context;
		}

		// Start a new load generation for this URI. This invalidates any concurrent
		// load that may be in progress (awaiting tokens or loading triples).
		const generation = this._tokenSource.beginLoad(uri);

		// Create a new context only when one doesn't exist.
		// On force reload we intentionally reuse the existing context so that
		// already available tokens can be reused and reindexing does not block
		// on token delivery timeouts.
		if (!context) {
			context = this._documentFactory.create(document.uri, document.languageId);

			// Register context immediately so language client notification handlers can find it.
			this.contexts[uri] = context;
		}

		// Set the slug before loading triples so that graphIri uses the human-readable
		// slug as the URI fragment from the very first load (rather than the opaque
		// VS Code-assigned cell fragment).
		if (slug !== undefined) {
			context.slug = slug;
		}

		const content = document.getText();

		// Check if the context already has parser output (from a language server notification
		// that arrived early). If not, wait for tokens from the language server.
		if (!context.isParsed) {
			try {
				// Parse the already-open document in-process. Passing the document
				// keeps this reliable and O(1): looking it up by URI in
				// `workspace.textDocuments` can miss a just-opened document that VS
				// Code has already dropped from the list (e.g. during bulk
				// indexing), which would otherwise stall for the full token-wait
				// timeout waiting for a delivery that never comes.
				await this._tokenSource.waitForTokens(uri, undefined, document);
			} catch (e) {
				// If this load was superseded by a newer one, abandon silently.
				if (!this._tokenSource.isCurrentLoad(uri, generation)) {
					return;
				}

				// Timeout waiting for tokens - this can happen if the language server is slow
				// or not responding or if the document simply does not contain any tokens (e.g. empty document). 
				// In this case, we proceed with loading the document without tokens, and log a warning.
				const message = getErrorMessage(e);

				getLog().warn(`Timeout waiting for tokens: ${uri}`, message);

				return context;
			}
		}

		// Check if this load was superseded after awaiting tokens.
		if (!this._tokenSource.isCurrentLoad(uri, generation)) {
			return;
		}

		// Tokens available, load triples into store.
		await context.loadTriples(content);

		// Check if this load was superseded after loading triples.
		if (!this._tokenSource.isCurrentLoad(uri, generation)) {
			return;
		}

		// Compute the inference graph on the document to simplify querying.
		await context.infer();

		// Final supersession check after all async work is done.
		if (!this._tokenSource.isCurrentLoad(uri, generation)) {
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
	 * Loads a document into a context directly from its raw content, without
	 * opening a VS Code text document. Workspace indexing uses this to avoid the
	 * dominant per-file cost of `openTextDocument` — building the text-document
	 * model and firing `onDidOpenTextDocument` to every registered provider — which
	 * profiling showed accounts for the bulk of indexing time.
	 *
	 * Parsing happens in-process and does not go through the token source, so this
	 * path deliberately does not emit token deliveries and therefore does not
	 * trigger the diagnostics that ride on them. Use an explicit workspace
	 * diagnostics run to validate indexed files.
	 * @param uri The document URI.
	 * @param content The document text (e.g. read via `workspace.fs.readFile`).
	 * @param forceReload Whether to rebuild an already-loaded context.
	 * @returns The loaded context, or `undefined` when the language is unsupported
	 * or the load was superseded by a newer one.
	 */
	async loadDocumentContent(uri: vscode.Uri, content: string, forceReload: boolean = false): Promise<IDocumentContext | undefined> {
		const languageId = this._documentFactory.getDocumentLanguageId(uri);

		if (!languageId || !this._documentFactory.supportedLanguages.has(languageId)) {
			return;
		}

		const key = uri.toString();

		let context = this._contexts[key];

		if (context?.isLoaded && !forceReload) {
			// Compute the inference graph on the document, if it does not exist.
			context.infer();

			return context;
		}

		// Start a new load generation so a concurrent editor-driven load can detect
		// that it superseded this one (and vice versa), mirroring loadDocument.
		const generation = this._tokenSource.beginLoad(key);

		if (!context) {
			context = this._documentFactory.create(uri, languageId);

			this._contexts[key] = context;
		}

		// Parse the content in-process. This sets the context's tokens/parsed data
		// exactly as a token-source delivery would, but without a text document.
		context.parse(content);

		if (!this._tokenSource.isCurrentLoad(key, generation)) {
			return;
		}

		await context.loadTriples(content);

		if (!this._tokenSource.isCurrentLoad(key, generation)) {
			return;
		}

		// Compute the inference graph on the document to simplify querying.
		await context.infer();

		if (!this._tokenSource.isCurrentLoad(key, generation)) {
			return;
		}

		// Set the language tag statistics for the document, needed for rendering multi-language labels.
		context.predicateStats = this._vocabulary.getPredicateUsageStats(context.graphs);

		// We default to the user choice of the primary language tag as there might be multiple languages in the document.
		context.activeLanguageTag = getConfig().get('definitionTree.defaultLanguageTag', context.primaryLanguage);

		this._contexts[key] = context;

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

		await this._setCursorOnResourceContext(editor);

		if (!editor) {
			await this._setConvertFileFormatContexts();
			await this._setTriplateTemplateContext();
			return;
		}

		const uri = editor.document.uri;

		if (!uri) {
			await this._setConvertFileFormatContexts();
			await this._setTriplateTemplateContext();
			return;
		}

		await this._setConvertFileFormatContexts(editor.document.languageId, uri.toString());
		await this._setTriplateTemplateContext(editor.document);

		if (uri === this.activeContext?.uri) return;

		// For notebook cells, find the slug from the cell metadata so that the
		// graph IRI uses the human-readable slug from the very first load.
		let slug: string | undefined;

		if (editor.document.uri.scheme === 'vscode-notebook-cell') {
			const uriStr = editor.document.uri.toString();

			for (const nb of vscode.workspace.notebookDocuments) {
				const cell = nb.getCells().find(c => c.document.uri.toString() === uriStr);

				if (cell) {
					slug = cell.metadata?.slug as string | undefined;
					break;
				}
			}
		}

		const context = await this.loadDocument(editor.document, false, slug);

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
	 * Sets the `mentor.editor.cursorOnResource` context key used to toggle visibility of the
	 * "Describe Resource" editor context-menu item. Updated synchronously on every selection
	 * change so the key is current when a right-click opens the menu.
	 * @param editor The editor whose caret position should be evaluated, or `undefined`.
	 */
	private async _setCursorOnResourceContext(editor?: vscode.TextEditor): Promise<void> {
		const uri = editor?.document?.uri?.toString();
		const position = editor?.selection?.active;
		const iri = uri && position ? this.contexts[uri]?.getIriAtPosition(position) : undefined;

		await vscode.commands.executeCommand('setContext', 'mentor.editor.cursorOnResource', !!iri);
	}

	/**
	 * Sets the `mentor.editor.isTriplateTemplate` context key used to toggle the
	 * template execute button in the editor title bar.
	 * @param document The active document, or `undefined` when there is no active editor.
	 */
	private async _setTriplateTemplateContext(document?: vscode.TextDocument): Promise<void> {
		const isTriplateTemplate = document ? isTemplate(document.getText()) : false;

		await vscode.commands.executeCommand('setContext', 'mentor.editor.isTriplateTemplate', isTriplateTemplate);
	}

	/**
	 * Sets the language-derived editor context keys for the active document: convert-file-format
	 * command visibility/enablement, `mentor.editor.isRdfDocument`, and `mentor.editor.isMentorLanguage`
	 * (used to gate resource-oriented features such as the "Describe Resource" menu item). Keying off
	 * the active document — rather than the caret — keeps these stable when a right-click opens a menu.
	 * @param languageId The language ID of the current document. If `undefined`, all contexts are set to `false`.
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

		// Whether the document is one of Mentor's first-class RDF authoring languages, sourced from
		// the canonical RDF_LANGUAGE_IDS list so menu `when` clauses need not duplicate it.
		const isRdfLanguage = languageId ? this._documentFactory.isRdfLanguage(languageId) : false;

		await vscode.commands.executeCommand('setContext', 'mentor.command.convertFileFormat.executable', convertible);
		await vscode.commands.executeCommand('setContext', 'mentor.editor.isRdfDocument', isRdfDocument);
		await vscode.commands.executeCommand('setContext', 'mentor.editor.isMentorLanguage', isRdfLanguage);

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
		if (!editor) {
			return;
		}

		// Load all RDF cells in the notebook to ensure their graphs are created.
		for (const cell of editor.notebook.getCells()) {
			if (this._documentFactory.isTripleSourceLanguage(cell.document.languageId)) {
				const slug = cell.metadata?.slug as string | undefined;

				await this.loadDocument(cell.document, false, slug);
			}
		}
	}

	/**
	 * Handle notebook document changed event.
	 * Assigns auto-generated slugs to newly inserted RDF cells so their ID CodeLens appears immediately.
	 * @param e The notebook document change event.
	 */
	async handleNotebookDocumentChanged(e: vscode.NotebookDocumentChangeEvent): Promise<void> {
		const addedCells: vscode.NotebookCell[] = [];

		for (const change of e.contentChanges) {
			for (const cell of change.addedCells) {
				const isTripleSource = this._documentFactory.isTripleSourceLanguage(cell.document.languageId);
				const hasSlug = typeof cell.metadata?.slug === 'string';

				if (isTripleSource && !hasSlug) {
					addedCells.push(cell);
				}
			}
		}

		if (addedCells.length === 0) {
			return;
		}

		const cellEdits: {
			cell: vscode.NotebookCell;
			metadata: { [key: string]: any },
			edit: vscode.NotebookEdit;
		}[] = [];

		let n = getMaxCellSlugNumber(e.notebook) + 1;

		for (const cell of addedCells) {
			const metadata = {
				...cell.metadata,
				slug: `cell-${n}`,
				slugIsAuto: true
			};

			cellEdits.push({
				cell,
				metadata: metadata,
				edit: vscode.NotebookEdit.updateCellMetadata(cell.index, metadata),
			});

			n++;
		}

		if (cellEdits.length > 0) {
			const workspaceEdit = new vscode.WorkspaceEdit();
			workspaceEdit.set(e.notebook.uri, cellEdits.map(e => e.edit));

			await vscode.workspace.applyEdit(workspaceEdit);

			for (const cellEdit of cellEdits) {
				const document = cellEdit.cell.document;
				const context = await this.loadDocument(document, false, cellEdit.metadata.slug);

				if (context) {
					this._onDidChangeDocumentContext.fire(context);
				}
			}
		}
	}

	/**
	 * Handle text document changed event. Does not trigger a full document reload. 
	 * Instead, the existing contextis kept visible and the reload happens when the 
	 * language server delivers updated tokens via the token source → _reloadContextTriples.
	 * @param e The text document change event.
	 */
	async handleTextDocumentChanged(e: vscode.TextDocumentChangeEvent): Promise<void> {
		if (!this._documentFactory.supportedLanguages.has(e.document.languageId)) {
			return;
		}

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
