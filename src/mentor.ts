import * as vscode from 'vscode';
import { DocumentContext } from './languages/document-context';
import { Store, OwlReasoner, OntologyRepository } from '@faubulous/mentor-rdf';
import { DocumentFactory } from './languages';
import { Settings, TreeLabelStyle } from './settings';

/**
 * Maps document URIs to loaded document contexts.
 */
export const contexts: { [key: string]: DocumentContext } = {};

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

const _onDidChangeDocumentContext = new vscode.EventEmitter<DocumentContext | undefined>();

export const onDidChangeVocabularyContext = _onDidChangeDocumentContext.event;

function onActiveEditorChanged(): void {
	const editor = vscode.window.activeTextEditor;

	if (editor && editor.document != activeContext?.document) {
		loadDocument(editor.document).then((context) => {
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
		return context;
	}

	context = documentFactory.create(document);

	await context.load(document);

	contexts[uri] = context;
	activeContext = context;

	for (let d of Object.values(contexts).filter(c => c.document.isClosed)) {
		const uri = d.document.uri.toString();

		delete contexts[uri];
	}

	return context;
}

export async function activateDocument(): Promise<vscode.TextEditor | undefined> {
	const activeTextEditor = vscode.window.activeTextEditor;

	if (activeContext && activeContext.document != activeTextEditor?.document) {
		await vscode.commands.executeCommand("vscode.open", activeContext.document.uri);
	}

	return activeTextEditor;
}

function initialize() {
	store.loadFrameworkOntologies().then(() => { });

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

	onActiveEditorChanged();
}

initialize();