import * as vscode from 'vscode';
import { IToken } from 'chevrotain';
import { Store, OwlReasoner, VocabularyRepository } from '@faubulous/mentor-rdf';
import { container } from 'tsyringe';
import { WorkspaceStorageService, GlobalStorageService } from './container';
import { DocumentContext } from './workspace/document-context';
import { DocumentContextManager } from './workspace/document-context-manager';
import { DocumentFactory } from './workspace/document-factory';
import { Settings } from './settings';
import { WorkspaceIndexer, DocumentIndex } from './workspace/workspace-indexer';
import { WorkspaceRepository } from './workspace/workspace-repository';
import {
	CredentialStorageService,
	PrefixDownloaderService,
	PrefixLookupService,
	SparqlConnectionService,
	SparqlQueryService,
} from './services';
import { TurtlePrefixDefinitionService } from './languages/turtle/services/turtle-prefix-definition-service';

/**
 * The Mentor extension identifier.
 */
export const MENTOR_EXTENSION_ID = 'faubulous.mentor';

/**
 * The Mentor extension instance.
 */
class MentorExtension {
	/**
	 * Cached reference to the DocumentContextManager from DI container.
	 */
	private _contextManager: DocumentContextManager | undefined;

	/**
	 * Get the DocumentContextManager singleton from the DI container.
	 */
	private get contextManager(): DocumentContextManager {
		if (!this._contextManager) {
			this._contextManager = container.resolve(DocumentContextManager);
		}
		return this._contextManager;
	}

	/**
	 * Maps document URIs to loaded document contexts.
	 * Delegates to DocumentContextManager.
	 */
	get contexts(): DocumentIndex {
		return this.contextManager.contexts;
	}

	/**
	 * The currently active document context or `undefined`.
	 * Delegates to DocumentContextManager.
	 */
	get activeContext(): DocumentContext | undefined {
		return this.contextManager.activeContext;
	}

	set activeContext(value: DocumentContext | undefined) {
		this.contextManager.activeContext = value;
	}

	/**
	 * A factory for loading and creating document contexts.
	 * Resolves from DI container.
	 */
	get documentFactory(): DocumentFactory {
		return container.resolve(DocumentFactory);
	}

	/**
	 * The Visual Studio Code configuration section for the extension.
	 */
	get configuration() {
		// The value of getConfiguration is a copy of the configuration and not a reference,
		// so we need to call getConfiguration each time to get the *latest* configuration.
		return vscode.workspace.getConfiguration('mentor');
	}

	/**
	 * The appliation state of the extension.
	 */
	readonly settings = new Settings();

	/**
	 * The active reasoner used for the Mentor triple store.
	 */
	get reasoner(): OwlReasoner {
		return container.resolve<OwlReasoner>("OwlReasoner");
	}

	/**
	 * The Mentor RDF extension triple store.
	 */
	get store(): Store {
		return container.resolve<Store>("Store");
	}

	/**
	 * A repository for retrieving ontology resources.
	 */
	get vocabulary(): VocabularyRepository {
		return container.resolve<VocabularyRepository>("VocabularyRepository");
	}

	/**
	 * A repository for retrieving workspace resources such as files and folders.
	 */
	get workspace(): WorkspaceRepository {
		return container.resolve(WorkspaceRepository);
	}

	/**
	 * A document indexer for indexing RDF files in the entire workspace.
	 */
	get workspaceIndexer(): WorkspaceIndexer {
		return container.resolve(WorkspaceIndexer);
	}

	/**
	 * A service for storing data that is only available in the workspace.
	 */
	get workspaceStorage(): WorkspaceStorageService {
		return container.resolve(WorkspaceStorageService);
	}

	/**
	 * A service for storing data that is available in all VS Code instances, independent of the workspace.
	 */
	get globalStorage(): GlobalStorageService {
		return container.resolve(GlobalStorageService);
	}

	/**
	 * A service for declaring prefixes in RDF documents.
	 */
	get prefixDeclarationService(): TurtlePrefixDefinitionService {
		return container.resolve(TurtlePrefixDefinitionService);
	}

	/**
	 * A service for downloading RDF prefix mappings from the web.
	 */
	get prefixDownloaderService(): PrefixDownloaderService {
		return container.resolve(PrefixDownloaderService);
	}

	/**
	 * A service for looking up prefixes in RDF documents.
	 */
	get prefixLookupService(): PrefixLookupService {
		return container.resolve(PrefixLookupService);
	}

	/**
	 * A service for managing connections to SPARQL endpoints.
	 */
	get sparqlConnectionService(): SparqlConnectionService {
		return container.resolve(SparqlConnectionService);
	}

	/**
	 * A service for executing queries against RDF triples stores and SPARQL endpoints.
	 */
	get sparqlQueryService(): SparqlQueryService {
		return container.resolve(SparqlQueryService);
	}

	/**
	 * A service for managing credentials using the SecretStorage of Visual Studio Code.
	 */
	get credentialStorageService(): CredentialStorageService {
		return container.resolve(CredentialStorageService);
	}

	/**
	 * An event that is fired after the active document context has changed.
	 * Delegates to DocumentContextManager.
	 */
	get onDidChangeVocabularyContext() {
		return this.contextManager.onDidChangeDocumentContext;
	}

	private readonly _onDidFinishInitializing = new vscode.EventEmitter<void>();

	/**
	 * An event that is fired after the extension has finished initializing and the workspace was indexed.
	 */
	readonly onDidFinishInitializing = this._onDidFinishInitializing.event;

	constructor() {
		vscode.window.onDidChangeActiveTextEditor(() => this._onActiveEditorChanged());
		vscode.window.onDidChangeActiveNotebookEditor((e) => this._onActiveNotebookEditorChanged(e));
		vscode.workspace.onDidChangeTextDocument((e) => this._onTextDocumentChanged(e));
		vscode.workspace.onDidCloseTextDocument((e) => this._onTextDocumentClosed(e));
	}

	/**
	 * Dispose the extension and clean up resources.
	 */
	dispose() {
		this.sparqlQueryService.dispose();

		this._onDidFinishInitializing.dispose();

		this.contextManager.dispose();
	}

	/**
	 * Wait for tokens to be delivered from the language server for a document.
	 * Delegates to DocumentContextManager.
	 * @param uri The document URI to wait for tokens.
	 * @param timeout Optional timeout in milliseconds.
	 * @returns A promise that resolves with the tokens or rejects on timeout.
	 */
	waitForTokens(uri: string, timeout?: number): Promise<IToken[]> {
		return this.contextManager.waitForTokens(uri, timeout);
	}

	/**
	 * Resolve pending token requests for a document. Called by language clients when tokens arrive.
	 * Delegates to DocumentContextManager.
	 * @param uri The document URI.
	 * @param tokens The tokens from the language server.
	 */
	resolveTokens(uri: string, tokens: IToken[]): void {
		this.contextManager.resolveTokens(uri, tokens);
	}

	/**
	 * Get the document context from a file or workspace URI.
	 * Delegates to DocumentContextManager.
	 * @param uri A document or workspace URI.
	 * @returns A document context if the document is loaded, `undefined` otherwise.
	 */
	getDocumentContextFromUri(uri: string): DocumentContext | undefined {
		return this.contextManager.getContextFromUri(uri);
	}

	/**
	 * Get the document context from a text document.
	 * Delegates to DocumentContextManager.
	 * @param document A text document.
	 * @param contextType The expected type of the document context.
	 * @returns A document context of the specified type if the document is loaded and matches the type, null otherwise.
	 */
	getDocumentContext<T extends DocumentContext>(document: vscode.TextDocument, contextType: new (...args: any[]) => T): T | null {
		return this.contextManager.getContext(document, contextType);
	}

	private _onActiveEditorChanged(): void {
		this.contextManager.handleActiveEditorChanged();
	}

	private _onActiveNotebookEditorChanged(editor: vscode.NotebookEditor | undefined): void {
		this.contextManager.handleActiveNotebookEditorChanged(editor);
	}

	private _onTextDocumentChanged(e: vscode.TextDocumentChangeEvent): void {
		this.contextManager.handleTextDocumentChanged(e);
	}

	private _onTextDocumentClosed(e: vscode.TextDocument): void {
		this.contextManager.handleDocumentClosed(e);
	}

	/**
	 * Activate the document in the editor.
	 * Delegates to DocumentContextManager.
	 * @returns A promise that resolves to the active text editor or `undefined`.
	 */
	async activateDocument(): Promise<vscode.TextEditor | undefined> {
		return this.contextManager.activateDocument();
	}

	/**
	 * Load a text document into a document context.
	 * Delegates to DocumentContextManager.
	 * @param document The text document to load.
	 * @param forceReload Indicates whether a new context should be created for existing contexts.
	 * @returns A promise that resolves to the document context or undefined if unsupported.
	 */
	async loadDocument(document: vscode.TextDocument, forceReload: boolean = false): Promise<DocumentContext | undefined> {
		return this.contextManager.loadDocument(document, forceReload);
	}

	/**
	 * Initialize the extension.
	 * @param context The extension context.
	 */
	async initialize(context: vscode.ExtensionContext) {
		vscode.commands.executeCommand('setContext', 'mentor.isInitializing', true);

		// Initialize the view settings.
		this.settings.initialize(this.configuration);

		// Load the endpoint configuration into memory.
		this.sparqlConnectionService.initialize();

		// Restore the query execution history.
		this.sparqlQueryService.initialize();

		// If there is a document opened in the editor, load it.
		this._onActiveEditorChanged();

		// Load the W3C and other common ontologies for providing hovers, completions and definitions.
		await this.store.loadFrameworkOntologies();

		// Load the workspace files and folders for the explorer tree view.
		await this.workspace.initialize();

		// Index the entire workspace for providing hovers, completions and definitions.
		await this.workspaceIndexer.indexWorkspace();

		vscode.commands.executeCommand('setContext', 'mentor.isInitializing', false);

		this._onDidFinishInitializing.fire();
	}
}

/**
 * The Mentor extension instance.
 */
export const mentor = new MentorExtension();