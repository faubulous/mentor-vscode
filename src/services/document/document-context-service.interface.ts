import * as vscode from 'vscode';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { DocumentIndex } from '@src/services/document/document-context-service';

/**
 * Interface for the DocumentContextService.
 */
export interface IDocumentContextService {
	/**
	 * Maps document URIs to loaded document contexts.
	 */
	readonly contexts: DocumentIndex;

	/**
	 * The currently active document context or `undefined`.
	 */
	activeContext: IDocumentContext | undefined;

	/**
	 * An event that is fired after the active document context has changed.
	 */
	readonly onDidChangeDocumentContext: vscode.Event<IDocumentContext | undefined>;

	/**
	 * Dispose the manager and clean up resources.
	 */
	dispose(): void;

	/**
	 * Get the document context from a URI.
	 * @param uri A document or workspace URI.
	 * @returns A document context if the document is loaded, `undefined` otherwise.
	 */
	getDocumentContextFromUri(uri: string): IDocumentContext | undefined;

	/**
	 * Get the document context from a text document.
	 * @param document A text document.
	 * @param contextType The expected type of the document context.
	 * @returns A document context of the specified type if the document is loaded and matches the type, null otherwise.
	 */
	getDocumentContext<T extends IDocumentContext>(document: vscode.TextDocument, contextType: new (...args: any[]) => T): T | null;

	/**
	 * Get the document context from a file or workspace URI.
	 * @param uri A document or workspace URI.
	 * @returns A document context if the document is loaded, `undefined` otherwise.
	 */
	getContextFromUri(uri: string): IDocumentContext | undefined;

	/**
	 * Get the document context from a text document.
	 * @param document A text document.
	 * @param contextType The expected type of the document context.
	 * @returns A document context of the specified type if the document is loaded and matches the type, null otherwise.
	 */
	getContext<T extends IDocumentContext>(document: vscode.TextDocument, contextType: new (...args: any[]) => T): T | null;

	/**
	 * Load a text document into a document context.
	 * @param document The text document to load.
	 * @param forceReload Indicates whether a new context should be created for existing contexts.
	 * @returns A promise that resolves to the document context or undefined if unsupported.
	 */
	loadDocument(document: vscode.TextDocument, forceReload?: boolean): Promise<IDocumentContext | undefined>;

	/**
	 * Make the context of a document the active one and publish the change. Used by editors
	 * that are not text editors, such as the form editor.
	 * @param document The document whose context should become active.
	 * @returns A promise that resolves to the activated context or `undefined` if unsupported.
	 */
	activateContextForDocument(document: vscode.TextDocument): Promise<IDocumentContext | undefined>;

	/**
	 * Loads the document of the editor that is active when the extension starts and
	 * makes it the active context. Called once, after all views and providers have
	 * subscribed to {@link onDidChangeDocumentContext}, so that none of them misses
	 * the first change.
	 */
	loadActiveEditorAtStartup(): Promise<void>;

	/**
	 * Indicates whether a load or triple reload of a document is in progress. Readers
	 * of the triple store then wait with {@link waitUntilLoaded}, so that they see all
	 * triples of the document, including the inferred ones, and not the state between
	 * two phases of the load.
	 * @param uri The document URI.
	 */
	isLoading(uri: string): boolean;

	/**
	 * Waits until the load or triple reload of a document that is in progress has
	 * finished. Resolves at once when none is in progress.
	 * @param uri The document URI.
	 */
	waitUntilLoaded(uri: string): Promise<void>;

	/**
	 * Activate the document associated with the active context in the editor.
	 * @returns A promise that resolves to the active text editor or `undefined`.
	 */
	activateDocument(): Promise<vscode.TextEditor | undefined>;

	/**
	 * Handle active editor changed event.
	 */
	handleActiveEditorChanged(): Promise<void>;

	/**
	 * Handle active notebook editor changed event.
	 * @param editor The notebook editor.
	 */
	handleActiveNotebookEditorChanged(editor: vscode.NotebookEditor | undefined): Promise<void>;

	/**
	 * Handle text document changed event.
	 * @param e The text document change event.
	 */
	handleTextDocumentChanged(e: vscode.TextDocumentChangeEvent): Promise<void>;

	/**
	 * Handle text document closed event.
	 * @param document The closed text document.
	 */
	handleDocumentClosed(document: vscode.TextDocument): void;

	/**
	 * Handle text document opened event, which is also fired when the language of a document changed.
	 * @param document The opened text document.
	 */
	handleTextDocumentOpened(document: vscode.TextDocument): Promise<void>;

	/**
	 * Removes the contexts of documents that no longer exist and deletes their graphs
	 * from the store. For a notebook file, the contexts of all of its cells are removed.
	 * @param uris The URIs of the removed files.
	 */
	removeDocuments(uris: ReadonlyArray<vscode.Uri>): void;
}
