import * as vscode from 'vscode';
import { DocumentContext } from './document-context';
import { Store, OwlReasoner, OntologyRepository } from '@faubulous/mentor-rdf';
import { DocumentFactory } from './languages';
import { Settings, TreeLabelStyle } from './settings';
import { DocumentIndexer, DocumentIndex } from './document-indexer';
import { WorkspaceRepository } from './workspace-repository';
import { LocalStorageService } from './services/local-storage-service';
import { PrefixDownloaderService } from './services/prefix-downloader-service';

/**
 * Maps document URIs to loaded document contexts.
 */
export const contexts: DocumentIndex = {};

/**
 * The currently active document context or `undefined`.
 */
export let activeContext: DocumentContext | undefined;

/**
 * The Visual Studio Code configuration section for the extension.
 */
export const configuration = vscode.workspace.getConfiguration('mentor');

/**
 * The appliation state of the extension.
 */
export const settings = new Settings();

/**
 * The Mentor RDF extension triple store.
 */
export const store = new Store(new OwlReasoner());

/**
 * A repository for retrieving ontology resources.
 */
export const ontology = new OntologyRepository(store);

/**
 * A repository for retrieving workspace resources such as files and folders.
 */
export const workspace = new WorkspaceRepository();

/**
 * A document indexer for indexing the entire workspace.
 */
export const indexer = new DocumentIndexer();

/**
 * A service for storing and retrieving data from the local storage with extension scope.
 */
export const globalStorage = new LocalStorageService();

const _onDidChangeDocumentContext = new vscode.EventEmitter<DocumentContext | undefined>();

export const onDidChangeVocabularyContext = _onDidChangeDocumentContext.event;

function onActiveEditorChanged(): void {
	const activeEditor = vscode.window.activeTextEditor;
	const uri = activeEditor?.document.uri;

	if (activeEditor && uri && uri != activeContext?.uri) {
		loadDocument(activeEditor.document).then((context) => {
			if (context) {
				activeContext = context;
				_onDidChangeDocumentContext?.fire(context);
			}
		});
	}
}

vscode.window.onDidChangeActiveTextEditor(() => onActiveEditorChanged());

function onTextDocumentChanged(e: vscode.TextDocumentChangeEvent): void {
	loadDocument(e.document, true).then((context) => {
		if (context) {
			_onDidChangeDocumentContext?.fire(context);
		}
	});
}

vscode.workspace.onDidChangeTextDocument((e) => onTextDocumentChanged(e));

/**
 * A factory for loading and creating document contexts.
 */
const documentFactory = new DocumentFactory();

async function loadDocument(document: vscode.TextDocument, reload: boolean = false): Promise<DocumentContext | undefined> {
	if (!document || !documentFactory.isSupported(document.languageId)) {
		return;
	}

	const uri = document.uri.toString();

	let context = contexts[uri];

	if (context && !reload) {
		// Compute the inference graph on the document, if it does not exist.
		context.infer();

		return context;
	}

	context = documentFactory.create(document.uri, document.languageId);

	await context.load(document.uri, document.getText(), true);

	contexts[uri] = context;
	activeContext = context;

	return context;
}

export async function activateDocument(): Promise<vscode.TextEditor | undefined> {
	const documentUri = vscode.window.activeTextEditor?.document.uri;

	if (activeContext && activeContext.uri != documentUri) {
		await vscode.commands.executeCommand("vscode.open", activeContext.uri);
	}

	return vscode.window.activeTextEditor;
}

export async function initialize(context: vscode.ExtensionContext) {
	// Initialize the extension persistence service.
	globalStorage.initialize(context.globalState);

	// Initialize the default label rendering style.
	let defaultStyle = configuration.get('treeLabelStyle');

	switch (defaultStyle) {
		case 'AnnotatedLabels':
			settings.set('view.treeLabelStyle', TreeLabelStyle.AnnotatedLabels);
			break;
		case 'UriLabelsWithPrefix':
			settings.set('view.treeLabelStyle', TreeLabelStyle.UriLabelsWithPrefix);
			break;
		default:
			settings.set('view.treeLabelStyle', TreeLabelStyle.UriLabels);
			break;
	}

	// Register commands..
	vscode.commands.registerCommand('mentor.action.updatePrefixes', () => {
		const service = new PrefixDownloaderService();

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Window,
			title: `Downloading prefixes from ${service.enpointUrl}...`,
			cancellable: false
		}, async (progress) => {
			progress.report({ increment: 0 });

			try {
				let result = await service.fetchPrefixes();

				globalStorage.setValue('prefixes', result);

				progress.report({ increment: 100 });
			} catch (error: any) {
				vscode.window.showErrorMessage(`Failed to download prefixes: ${error.message}`);
			}
		});
	});

	vscode.commands.registerCommand('mentor.action.showAnnotatedLabels', () => {
		settings.set('view.treeLabelStyle', TreeLabelStyle.AnnotatedLabels);
	});

	vscode.commands.registerCommand('mentor.action.showUriLabels', () => {
		settings.set('view.treeLabelStyle', TreeLabelStyle.UriLabels);
	});

	vscode.commands.registerCommand('mentor.action.showUriLabelsWithPrefix', () => {
		settings.set('view.treeLabelStyle', TreeLabelStyle.UriLabelsWithPrefix);
	});

	vscode.commands.registerCommand('mentor.action.showReferencedClasses', () => {
		settings.set('view.showReferencedClasses', true);
	});

	vscode.commands.registerCommand('mentor.action.hideReferencedClasses', () => {
		settings.set('view.showReferencedClasses', false);
	});

	vscode.commands.registerCommand('mentor.action.showPropertyTypes', () => {
		settings.set('view.showPropertyTypes', true);
	});

	vscode.commands.registerCommand('mentor.action.hidePropertyTypes', () => {
		settings.set('view.showPropertyTypes', false);
	});

	vscode.commands.registerCommand('mentor.action.showIndividualTypes', () => {
		settings.set('view.showIndividualTypes', true);
	});

	vscode.commands.registerCommand('mentor.action.hideIndividualTypes', () => {
		settings.set('view.showIndividualTypes', false);
	});

	vscode.commands.registerCommand('mentor.action.initialize', async () => {
		vscode.commands.executeCommand('setContext', 'mentor.isInitializing', true);

		// If there is a document opened in the editor, load it.
		onActiveEditorChanged();

		// Load the workspace files and folders for the explorer tree view.
		await workspace.initialize();

		// Load the W3C and other common ontologies for providing hovers, completions and definitions.
		await store.loadFrameworkOntologies();

		// Index the entire workspace for providing hovers, completions and definitions.
		await indexer.indexWorkspace();

		vscode.commands.executeCommand('setContext', 'mentor.isInitializing', false);
	});

	vscode.commands.executeCommand('mentor.action.initialize');
}

/**
 * Get the glob patterns to exclude files and folders from the workspace.
 * @param workspaceUri A workspace folder URI.
 * @returns A list of glob patterns to exclude files and folders.
 */
export async function getExcludePatterns(workspaceUri: vscode.Uri): Promise<string[]> {
	let result = new Set<string>();

	// Add the patterns from the configuration.
	for (let pattern of configuration.get('workspace.ignoreFolders', [])) {
		result.add(pattern);
	}

	// Add the patterns from the .gitignore file if it is enabled.
	if (configuration.get('workspace.useGitIgnore')) {
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
			console.warn(`File not found: ${gitignore.fsPath}`);
		}
	}

	return Array.from(result);
}