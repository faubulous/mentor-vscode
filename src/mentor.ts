import * as vscode from 'vscode';
import { DocumentContext } from './languages/document-context';
import { Store, OwlReasoner, OntologyRepository } from '@faubulous/mentor-rdf';
import { DocumentFactory } from './languages';

/**
 * Maps document URIs to loaded document contexts.
 */
export const contexts: { [key: string]: DocumentContext } = {};

/**
 * The currently active document context or `undefined`.
 */
export let activeContext: DocumentContext | undefined;

/**
 * Idicates whether to show annotated labels in tree views, e.g. rdfs:label.
 */
export let showAnnotatedLabels: boolean = true;

/**
 * The Mentor RDF extension triple store.
 */
export const store = new Store(new OwlReasoner());

/**
 * A repository for retrieving ontology resources.
 */
export const ontology = new OntologyRepository(store);

const _onDidChangeTreeLabelSettings = new vscode.EventEmitter<void>();

export const onDidChangeTreeLabelSettings = _onDidChangeTreeLabelSettings.event;

const _onDidChangeDocumentContext = new vscode.EventEmitter<DocumentContext | undefined>();

export const onDidChangeVocabularyContext = _onDidChangeDocumentContext.event;

const documentFactory = new DocumentFactory();

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
	if (documentFactory.isSupported(e.document.languageId)) {
		loadDocument(e.document, true).then((context) => {
			if (context) {
				_onDidChangeDocumentContext?.fire(context);
			}
		});
	}
}

vscode.workspace.onDidChangeTextDocument((e) => onTextDocumentChanged(e));

async function loadDocument(document: vscode.TextDocument, reload: boolean = false): Promise<DocumentContext | undefined> {
	if (!document) {
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
		await vscode.commands.executeCommand<vscode.TextDocumentShowOptions>("vscode.open", activeContext.document.uri);
	}

	return activeTextEditor;
}

function initialize() {
	store.loadFrameworkOntologies().then(() => { });

	onActiveEditorChanged();

	let annotatedLabelsEnabled = vscode.workspace.getConfiguration('mentor').get('annotatedLabelsEnabled');

	vscode.commands.executeCommand('setContext', 'showAnnotatedLabels', annotatedLabelsEnabled);

	vscode.commands.registerCommand('mentor.action.showAnnotatedLabels', () => {
		showAnnotatedLabels = true;

		vscode.commands.executeCommand('setContext', 'showAnnotatedLabels', showAnnotatedLabels);

		if (activeContext) {
			_onDidChangeTreeLabelSettings.fire();
		}
	});

	vscode.commands.registerCommand('mentor.action.showUriLabels', () => {
		showAnnotatedLabels = false;

		vscode.commands.executeCommand('setContext', 'showAnnotatedLabels', showAnnotatedLabels);

		if (activeContext) {
			_onDidChangeTreeLabelSettings.fire();
		}
	});
}

initialize();