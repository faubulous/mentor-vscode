import * as vscode from 'vscode';
import * as n3 from 'n3';
import { DocumentContext } from './document-context';
import { Store, OwlReasoner, VocabularyRepository } from '@faubulous/mentor-rdf';
import { DocumentFactory } from './languages';
import { DefinitionTreeLayout, Settings, TreeLabelStyle } from './settings';
import { WorkspaceIndexer, DocumentIndex } from './workspace-indexer';
import { WorkspaceRepository } from './workspace-repository';
import {
	LocalStorageService,
	PrefixDownloaderService,
	PrefixDefinitionService,
	PrefixLookupService
} from './services';
import { NamedNode } from '@rdfjs/types';

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
	 * The Mentor RDF extension triple store.
	 */
	readonly store = new Store(new OwlReasoner());

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
	 * A service for storing and retrieving data from the local storage with extension scope.
	 */
	readonly localStorageService = new LocalStorageService();

	/**
	 * A service for declaring prefixes in RDF documents.
	 */
	readonly prefixDeclarationService = new PrefixDefinitionService();

	/**
	 * A service for downloading RDF prefix mappings from the web.
	 */
	readonly prefixDownloaderService = new PrefixDownloaderService();

	/**
	 * A service for looking up prefixes in RDF documents.
	 */
	readonly prefixLookupService = new PrefixLookupService();

	private readonly _onDidChangeDocumentContext = new vscode.EventEmitter<DocumentContext | undefined>();

	/**
	 * An event that is fired after the active document context has changed.
	 */
	readonly onDidChangeVocabularyContext = this._onDidChangeDocumentContext.event;

	constructor() {
		vscode.window.onDidChangeActiveTextEditor(() => this._onActiveEditorChanged());
		vscode.workspace.onDidChangeTextDocument((e) => this._onTextDocumentChanged(e));
		vscode.workspace.onDidCloseTextDocument((e) => this._onTextDocumentClosed(e));
	}

	/**
	 * Get the RDF document context for a text document.
	 * @param document A text document.
	 * @returns A document context for the given document or `undefined`.
	 */
	getDocumentContext(document: vscode.TextDocument): DocumentContext | undefined {
		return this.contexts[document.uri.toString()];
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

			// Automatically declare prefixes when a colon is typed.
			const change = e.contentChanges[0];

			if (change?.text.endsWith(':') && this.configuration.get('prefixes.autoDefinePrefixes')) {
				// Determine the token type at the change position.
				const token = context.getTokensAtPosition(change.range.start)[0];

				// Do not auto-implement prefixes when manually typing a prefix.
				const n = context.tokens.findIndex(t => t === token);
				const t = context.tokens[n - 1]?.image.toLowerCase();

				// Note: we check the token image instead of the type name to also account for Turtle style prefix
				// definitions in SPARQL queries. These are not supported by SPARQL and detected as language tags.
				// Although this kind of prefix declaration is not valid in SPARQL, implementing the prefix should be avoided.
				if(t === 'prefix' || t === '@prefix') return;

				if (token && token.image && token.tokenType?.tokenName === 'PNAME_NS') {
					const prefix = token.image.substring(0, token.image.length - 1);

					// Do not implmenet prefixes that are already defined.
					if (context.namespaces[prefix]) return;

					this.prefixDeclarationService.implementPrefixes(e.document, [{ prefix: prefix, namespaceIri: undefined }]).then(edit => {
						if (edit.size > 0) {
							vscode.workspace.applyEdit(edit);
						}
					});
				}
			}
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
		await context.parse(document.uri, document.getText());

		// Compute the inference graph on the document to simplify querying.
		await context.infer();

		// Set the language tag statistics for the document, needed for rendering multi-language labels.
		context.predicateStats = this.vocabulary.getPredicateUsageStats(context.graphs);

		// We default to the user choice of the primary language tag as there might be multiple languages in the document.
		context.activeLanguageTag = mentor.configuration.get('definitionTree.defaultLanguageTag', context.primaryLanguage);

		this.contexts[uri] = context;
		this.activeContext = context;

		return context;
	}

	/**
	 * Initialize the extension.
	 * @param context The extension context.
	 */
	async initialize(context: vscode.ExtensionContext) {
		// Initialize the extension persistence service.
		this.localStorageService.initialize(context.globalState);

		// Initialize the view settings.
		this.settings.initialize(this.configuration);

		// Register commands..
		vscode.commands.registerCommand('mentor.action.updatePrefixes', () => {
			vscode.window.withProgress({
				location: vscode.ProgressLocation.Window,
				title: `Downloading prefixes from ${this.prefixDownloaderService.endpointUrl}...`,
				cancellable: false
			}, async (progress) => {
				progress.report({ increment: 0 });

				try {
					let result = await this.prefixDownloaderService.fetchPrefixes();

					this.localStorageService.setValue('defaultPrefixes', result);

					progress.report({ increment: 100 });
				} catch (error: any) {
					vscode.window.showErrorMessage(`Failed to download prefixes: ${error.message}`);
				}
			});
		});

		vscode.commands.registerCommand('mentor.action.groupDefinitionsByType', () => {
			this.settings.set('view.definitionTree.defaultLayout', DefinitionTreeLayout.ByType);
		});

		vscode.commands.registerCommand('mentor.action.groupDefinitionsBySource', () => {
			this.settings.set('view.definitionTree.defaultLayout', DefinitionTreeLayout.BySource);
		});

		vscode.commands.registerCommand('mentor.action.showAnnotatedLabels', () => {
			this.settings.set('view.definitionTree.labelStyle', TreeLabelStyle.AnnotatedLabels);
		});

		vscode.commands.registerCommand('mentor.action.showUriLabels', () => {
			this.settings.set('view.definitionTree.labelStyle', TreeLabelStyle.UriLabels);
		});

		vscode.commands.registerCommand('mentor.action.showUriLabelsWithPrefix', () => {
			this.settings.set('view.definitionTree.labelStyle', TreeLabelStyle.UriLabelsWithPrefix);
		});

		vscode.commands.registerCommand('mentor.action.showReferences', () => {
			this.settings.set('view.showReferences', true);
		});

		vscode.commands.registerCommand('mentor.action.hideReferences', () => {
			this.settings.set('view.showReferences', false);
		});

		vscode.commands.registerCommand('mentor.action.showPropertyTypes', () => {
			this.settings.set('view.showPropertyTypes', true);
		});

		vscode.commands.registerCommand('mentor.action.hidePropertyTypes', () => {
			this.settings.set('view.showPropertyTypes', false);
		});

		vscode.commands.registerCommand('mentor.action.showIndividualTypes', () => {
			this.settings.set('view.showIndividualTypes', true);
		});

		vscode.commands.registerCommand('mentor.action.hideIndividualTypes', () => {
			this.settings.set('view.showIndividualTypes', false);
		});

		vscode.commands.registerCommand('mentor.action.initialize', async () => {
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
		});

		vscode.commands.executeCommand('mentor.action.initialize');

		vscode.commands.registerCommand('mentor.action.openInferenceGraph', async () => {
			if (this.activeContext) {
				const documentGraphIri = this.activeContext.uri.toString();
				const inferenceGraphIri = mentor.store.reasoner?.getInferenceGraphUri(documentGraphIri);

				if(inferenceGraphIri) {
					const prefixes: {[prefix: string]: NamedNode} = {};

					// TODO: This is not needed; adapt mentor-rdf API.
					for(const [prefix, namespace] of Object.entries(this.activeContext.namespaces)) {
						prefixes[prefix] = new n3.NamedNode(namespace);
					}

					const data = await mentor.store.serializeGraph(inferenceGraphIri, prefixes);
					
					await vscode.workspace.openTextDocument({ content: data, language: 'turtle' });
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