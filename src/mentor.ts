import * as vscode from 'vscode';
import { IToken } from 'chevrotain';
import { Store, OwlReasoner, VocabularyRepository } from '@faubulous/mentor-rdf';
import { container } from 'tsyringe';
import { configureContainer } from './container';
import { DocumentContext } from './workspace/document-context';
import { DocumentContextManager } from './workspace/document-context-manager';
import { DocumentFactory } from './workspace/document-factory';
import { Settings } from './settings';
import { WorkspaceIndexer, DocumentIndex } from './workspace/workspace-indexer';
import { WorkspaceRepository } from './workspace/workspace-repository';
import {
	CredentialStorageService,
	LocalStorageService,
	PrefixDownloaderService,
	PrefixLookupService,
	SparqlConnectionService,
	SparqlQueryService,
	TurtlePrefixDefinitionService,
} from './services';
import { WorkspaceUri } from './workspace/workspace-uri';

/**
 * The Mentor extension identifier.
 */
export const MENTOR_EXTENSION_ID = 'faubulous.mentor';

// Configure the DI container on module load
configureContainer();

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
	readonly reasoner = container.resolve(OwlReasoner);

	/**
	 * The Mentor RDF extension triple store.
	 */
	readonly store = container.resolve(Store);

	/**
	 * A repository for retrieving ontology resources.
	 */
	readonly vocabulary = container.resolve(VocabularyRepository);

	/**
	 * A repository for retrieving workspace resources such as files and folders.
	 */
	readonly workspace = new WorkspaceRepository(this.documentFactory);

	/**
	 * A document indexer for indexing RDF files in the entire workspace.
	 */
	readonly workspaceIndexer = new WorkspaceIndexer();

	/**
	 * A service for storing data that is only available in the workspace.
	 */
	readonly workspaceStorage = new LocalStorageService();

	/**
	 * A service for storing data that is available in all VS Code instances, independent of the workspace.
	 */
	readonly globalStorage = new LocalStorageService();

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
	readonly credentialStorageService = new CredentialStorageService();

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

	private _onActiveEditorChanged(): void {
		const editor = vscode.window.activeTextEditor;

		if (!editor) return;

		const uri = editor.document.uri;

		if (!uri || uri === this.activeContext?.uri) return;

		this.loadDocument(editor.document).then((context) => {
			if (context) {
				this.activeContext = context;
				this.contextManager.fireDocumentContextChanged(context);
			}

			const convertible = this.documentFactory.isConvertibleLanguage(editor.document.languageId);

			vscode.commands.executeCommand("setContext", "mentor.command.convertFileFormat.executable", convertible);
		});
	}

	private _onActiveNotebookEditorChanged(editor: vscode.NotebookEditor | undefined): void {
		if (!editor) return;

		// Load all RDF cells in the notebook to ensure their graphs are created.
		for (const cell of editor.notebook.getCells()) {
			if (this.documentFactory.isTripleSourceLanguage(cell.document.languageId)) {
				this.loadDocument(cell.document);
			}
		}
	}

	private _onTextDocumentChanged(e: vscode.TextDocumentChangeEvent): void {
		// Reload the document context when the document has changed.
		this.loadDocument(e.document, true).then((context) => {
			if (!context) return;

			// Update the active document context if it has changed.
			this.activeContext = context;

			this.contextManager.fireDocumentContextChanged(context);

			context.onDidChangeDocument(e);
		});
	}

	private _onTextDocumentClosed(e: vscode.TextDocument): void {
		const uri = e.uri.toString();
		const context = this.contexts[uri];

		if (context && context.isTemporary) {
			// Cleanup temporary / non-persisted document context generated by views.
			delete this.contexts[uri];
		}
	}

	/**
	 * Activate the document in the editor.
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
	 * Load a text document into a document context.
	 * @param document The text document to load.
	 * @param forceReload Indicates whether a new context should be created for existing contexts.
	 * @param setActive Indicates whether the loaded context should be set as the active context.
	 * @returns 
	 */
	async loadDocument(document: vscode.TextDocument, forceReload: boolean = false): Promise<DocumentContext | undefined> {
		if (!document || !this.documentFactory.supportedLanguages.has(document.languageId)) {
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
			context = this.documentFactory.create(document.uri, document.languageId);

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
		context.predicateStats = this.vocabulary.getPredicateUsageStats(context.graphs);

		// We default to the user choice of the primary language tag as there might be multiple languages in the document.
		context.activeLanguageTag = mentor.configuration.get('definitionTree.defaultLanguageTag', context.primaryLanguage);

		this.contexts[uri] = context;

		// Only set the active context if it matches the active text editor document.
		const activeEditor = vscode.window.activeTextEditor;

		if (activeEditor && uri === activeEditor.document?.uri.toString()) {
			this.activeContext = context;
		}

		return context;
	}

	/**
	 * Initialize the extension.
	 * @param context The extension context.
	 */
	async initialize(context: vscode.ExtensionContext) {
		vscode.commands.executeCommand('setContext', 'mentor.isInitializing', true);

		// Initialize the extension persistence service.
		this.workspaceStorage.initialize(context.workspaceState);
		this.globalStorage.initialize(context.globalState);

		// Initialize the view settings.
		this.settings.initialize(this.configuration);

		// Initialize the credential storage service used for storing SPARQL endpoint credentials.
		this.credentialStorageService.initialize(context.secrets);

		// Load the endpoint configuration into memory.
		this.sparqlConnectionService.initialize();

		// Restore the query execution history.
		this.sparqlQueryService.initialize();

		// If there is a document opened in the editor, load it.
		this._onActiveEditorChanged();

		// Load the W3C and other common ontologies for providing hovers, completions and definitions.
		await mentor.store.loadFrameworkOntologies();

		// Load the workspace files and folders for the explorer tree view.
		await mentor.workspace.initialize();

		// Index the entire workspace for providing hovers, completions and definitions.
		await mentor.workspaceIndexer.indexWorkspace();

		vscode.commands.executeCommand('setContext', 'mentor.isInitializing', false);

		this._onDidFinishInitializing.fire();
	}

	/**
	 * Get the glob patterns to exclude files and folders from the workspace.
	 * @param workspaceUri A workspace folder URI.
	 * @returns A list of glob patterns to exclude files and folders.
	 */
	async getExcludePatterns(workspaceUri: vscode.Uri): Promise<string[]> {
		let result = new Set<string>();

		// Add the patterns from the configuration.
		for (let pattern of this.configuration.get('index.ignoreFolders', [])) {
			result.add(pattern);
		}

		// Add the patterns from the .gitignore file if it is enabled.
		if (this.configuration.get('index.useGitIgnore')) {
			const gitignore = vscode.Uri.joinPath(workspaceUri, '.gitignore');

			try {
				const content = await vscode.workspace.fs.readFile(gitignore);

				const excludePatterns = new TextDecoder().decode(content)
					.split('\n')
					.filter(line => !line.startsWith('#') && line.trim() !== '');

				for (const pattern of excludePatterns) {
					result.add(pattern);
				}
			} catch {
				// If the .gitignore file does not exists, ingore it.
			}
		}

		return Array.from(result);
	}
}

/**
 * The Mentor extension instance.
 */
export const mentor = new MentorExtension();