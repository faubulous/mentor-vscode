import * as vscode from 'vscode';
import { Store, OwlReasoner, GraphUriGenerator, VocabularyRepository } from '@faubulous/mentor-rdf';
import { DocumentContext } from './workspace/document-context';
import { DocumentFactory } from './workspace/document-factory';
import { DefinitionTreeLayout, Settings, TreeLabelStyle } from './settings';
import { WorkspaceIndexer, DocumentIndex } from './workspace/workspace-indexer';
import { WorkspaceRepository } from './workspace/workspace-repository';
import {
	CredentialStorageService,
	LocalStorageService,
	PrefixDownloaderService,
	PrefixLookupService,
	SparqlEndpointService,
	SparqlQueryService,
	TurtlePrefixDefinitionService,
} from './services';
import { NamedNode, Quad_Graph } from '@rdfjs/types';
import { InferenceUri } from './workspace/inference-uri';

class MentorGraphUriGenerator implements GraphUriGenerator {
	getGraphUri(uri: string | Quad_Graph): string {
		const value = typeof uri === 'string' ? uri : uri.value;

		return InferenceUri.toInferenceUri(value);
	}
}

/**
 * The Mentor extension instance.
 */
class MentorExtension {
	/**
	 * Maps document URIs to loaded document contexts.
	 */
	readonly contexts: DocumentIndex = {};

	/**
	 * The currently active document context or `undefined`.
	 */
	activeContext: DocumentContext | undefined;

	/**
	 * A factory for loading and creating document contexts.
	 */
	readonly documentFactory = new DocumentFactory();

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
	readonly reasoner = new OwlReasoner(new MentorGraphUriGenerator());

	/**
	 * The Mentor RDF extension triple store.
	 */
	readonly store = new Store(this.reasoner);

	/**
	 * A repository for retrieving ontology resources.
	 */
	readonly vocabulary = new VocabularyRepository(this.store);

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
	readonly prefixDeclarationService = new TurtlePrefixDefinitionService();

	/**
	 * A service for downloading RDF prefix mappings from the web.
	 */
	readonly prefixDownloaderService = new PrefixDownloaderService();

	/**
	 * A service for looking up prefixes in RDF documents.
	 */
	readonly prefixLookupService = new PrefixLookupService();

	/**
	 * A service for managing connections to SPARQL endpoints.
	 */
	readonly sparqlEndpointService = new SparqlEndpointService();

	/**
	 * A service for executing queries against RDF triples stores and SPARQL endpoints.
	 */
	readonly sparqlQueryService = new SparqlQueryService(this.sparqlEndpointService);

	/**
	 * A service for managing credentials using the SecretStorage of Visual Studio Code.
	 */
	readonly credentialStorageService = new CredentialStorageService();

	private readonly _onDidChangeDocumentContext = new vscode.EventEmitter<DocumentContext | undefined>();

	/**
	 * An event that is fired after the active document context has changed.
	 */
	readonly onDidChangeVocabularyContext = this._onDidChangeDocumentContext.event;

	private readonly _onDidFinishInitializing = new vscode.EventEmitter<void>();

	/**
	 * An event that is fired after the extension has finished initializing and the workspace was indexed.
	 */
	readonly onDidFinishInitializing = this._onDidFinishInitializing.event;

	constructor() {
		vscode.window.onDidChangeActiveTextEditor(() => this._onActiveEditorChanged());
		vscode.workspace.onDidChangeTextDocument((e) => this._onTextDocumentChanged(e));
		vscode.workspace.onDidCloseTextDocument((e) => this._onTextDocumentClosed(e));
	}

	/**
	 * Dispose the extension and clean up resources.
	 */
	dispose() {
		this.sparqlQueryService.dispose();

		this._onDidChangeDocumentContext.dispose();
		this._onDidFinishInitializing.dispose();
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
		const activeEditor = vscode.window.activeTextEditor;
		const uri = activeEditor?.document.uri;

		if (activeEditor && uri && uri != this.activeContext?.uri) {
			this.loadDocument(activeEditor.document).then((context) => {
				if (context) {
					this.activeContext = context;
					this._onDidChangeDocumentContext?.fire(context);
				}
			});
		}
	}

	private _onTextDocumentChanged(e: vscode.TextDocumentChangeEvent): void {
		// Reload the document context when the document has changed.
		this.loadDocument(e.document, true).then((context) => {
			if (!context) return;

			// Update the active document context if it has changed.
			this.activeContext = context;

			this._onDidChangeDocumentContext?.fire(context);

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

		let context = this.contexts[uri];

		if (context?.isLoaded && !forceReload) {
			// Compute the inference graph on the document, if it does not exist.
			context.infer();

			return context;
		}

		context = this.documentFactory.create(document.uri, document.languageId);

		// Parse the tokens of the document and load the graph.
		await context.parse(document.getText());

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
		// Initialize the extension persistence service.
		this.workspaceStorage.initialize(context.workspaceState);
		this.globalStorage.initialize(context.globalState);

		// Initialize the view settings.
		this.settings.initialize(this.configuration);

		// Initialize the credential storage service used for storing SPARQL endpoint credentials.
		this.credentialStorageService.initialize(context.secrets);

		// Load the endpoint configuration into memory.
		this.sparqlEndpointService.initialize();

		// Restore the query execution history.
		this.sparqlQueryService.initialize();

		// Register commands..
		vscode.commands.registerCommand('mentor.command.groupDefinitionsByType', () => {
			this.settings.set('view.definitionTree.defaultLayout', DefinitionTreeLayout.ByType);
		});

		vscode.commands.registerCommand('mentor.command.groupDefinitionsBySource', () => {
			this.settings.set('view.definitionTree.defaultLayout', DefinitionTreeLayout.BySource);
		});

		vscode.commands.registerCommand('mentor.command.showAnnotatedLabels', () => {
			this.settings.set('view.definitionTree.labelStyle', TreeLabelStyle.AnnotatedLabels);
		});

		vscode.commands.registerCommand('mentor.command.showUriLabels', () => {
			this.settings.set('view.definitionTree.labelStyle', TreeLabelStyle.UriLabels);
		});

		vscode.commands.registerCommand('mentor.command.showUriLabelsWithPrefix', () => {
			this.settings.set('view.definitionTree.labelStyle', TreeLabelStyle.UriLabelsWithPrefix);
		});

		vscode.commands.registerCommand('mentor.command.showReferences', () => {
			this.settings.set('view.showReferences', true);
		});

		vscode.commands.registerCommand('mentor.command.hideReferences', () => {
			this.settings.set('view.showReferences', false);
		});

		vscode.commands.registerCommand('mentor.command.showPropertyTypes', () => {
			this.settings.set('view.showPropertyTypes', true);
		});

		vscode.commands.registerCommand('mentor.command.hidePropertyTypes', () => {
			this.settings.set('view.showPropertyTypes', false);
		});

		vscode.commands.registerCommand('mentor.command.showIndividualTypes', () => {
			this.settings.set('view.showIndividualTypes', true);
		});

		vscode.commands.registerCommand('mentor.command.hideIndividualTypes', () => {
			this.settings.set('view.showIndividualTypes', false);
		});

		vscode.commands.registerCommand('mentor.command.initialize', async () => {
			vscode.commands.executeCommand('setContext', 'mentor.isInitializing', true);

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
		});

		vscode.commands.executeCommand('mentor.command.initialize');

		vscode.commands.registerCommand('mentor.command.highlightTypeDefinitions', async () => {
			if (this.activeContext) {
				const document = await vscode.workspace.openTextDocument(this.activeContext.uri);
				const editor = await vscode.window.showTextDocument(document, { preview: false });

				if (editor) {
					const ranges = [...Object.values(this.activeContext.typeDefinitions)]
						.flatMap(value => Array.isArray(value) ? value : [])
						.map(value => new vscode.Range(value.start.line, value.start.character, value.end.line, value.end.character));

					editor.setDecorations(vscode.window.createTextEditorDecorationType({
						backgroundColor: 'rgba(255, 255, 0, 0.3)',
					}), ranges);
				}
			}
		});

		vscode.commands.registerCommand('mentor.command.highlightTypeAssertions', async () => {
			if (this.activeContext) {
				const document = await vscode.workspace.openTextDocument(this.activeContext.uri);
				const editor = await vscode.window.showTextDocument(document, { preview: false });

				if (editor) {
					const ranges = [...Object.values(this.activeContext.typeAssertions)]
						.flatMap(value => Array.isArray(value) ? value : [])
						.map(value => new vscode.Range(value.start.line, value.start.character, value.end.line, value.end.character));

					editor.setDecorations(vscode.window.createTextEditorDecorationType({
						backgroundColor: 'rgba(255, 255, 0, 0.3)',
					}), ranges);
				}
			}
		});

		vscode.commands.registerCommand('mentor.command.highlightReferencedIris', async () => {
			if (this.activeContext) {
				const document = await vscode.workspace.openTextDocument(this.activeContext.uri);
				const editor = await vscode.window.showTextDocument(document, { preview: false });

				if (editor) {
					const ranges = [...Object.values(this.activeContext.references)]
						.flatMap(value => Array.isArray(value) ? value : [])
						.map(value => new vscode.Range(value.start.line, value.start.character, value.end.line, value.end.character));

					editor.setDecorations(vscode.window.createTextEditorDecorationType({
						backgroundColor: 'rgba(255, 255, 0, 0.3)',
					}), ranges);
				}
			}
		});

		vscode.commands.registerCommand('mentor.command.highlightNamespaceDefinitions', async () => {
			if (this.activeContext) {
				const document = await vscode.workspace.openTextDocument(this.activeContext.uri);
				const editor = await vscode.window.showTextDocument(document, { preview: false });

				if (editor) {
					const ranges = [...Object.values(this.activeContext.namespaceDefinitions)]
						.flatMap(value => Array.isArray(value) ? value : [])
						.map(value => new vscode.Range(value.start.line, value.start.character, value.end.line, value.end.character));

					editor.setDecorations(vscode.window.createTextEditorDecorationType({
						backgroundColor: 'rgba(255, 255, 0, 0.3)',
					}), ranges);
				}
			}
		});
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