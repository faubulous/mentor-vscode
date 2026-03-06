import * as vscode from 'vscode';
import { IToken } from '@faubulous/mentor-rdf-parsers';
import { DocumentContext } from '@src/workspace/document-context';
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
	activeContext: DocumentContext | undefined;

	/**
	 * An event that is fired after the active document context has changed.
	 */
	readonly onDidChangeDocumentContext: vscode.Event<DocumentContext | undefined>;

	/**
	 * Dispose the manager and clean up resources.
	 */
	dispose(): void;

	/**
	 * Get the document context from a URI.
	 * @param uri A document or workspace URI.
	 * @returns A document context if the document is loaded, `undefined` otherwise.
	 */
	getDocumentContextFromUri(uri: string): DocumentContext | undefined;

	/**
	 * Get the document context from a text document.
	 * @param document A text document.
	 * @param contextType The expected type of the document context.
	 * @returns A document context of the specified type if the document is loaded and matches the type, null otherwise.
	 */
	getDocumentContext<T extends DocumentContext>(document: vscode.TextDocument, contextType: new (...args: any[]) => T): T | null;

	/**
	 * Wait for tokens to be delivered from the language server for a document.
	 * @param uri The document URI to wait for tokens.
	 * @param timeout Optional timeout in milliseconds.
	 * @returns A promise that resolves with the tokens or rejects on timeout.
	 */
	waitForTokens(uri: string, timeout?: number): Promise<IToken[]>;

	/**
	 * Resolve pending token requests for a document. Called by language clients when tokens arrive.
	 * @param uri The document URI.
	 * @param tokens The tokens from the language server.
	 */
	resolveTokens(uri: string, tokens: IToken[]): void;

	/**
	 * Get the document context from a file or workspace URI.
	 * @param uri A document or workspace URI.
	 * @returns A document context if the document is loaded, `undefined` otherwise.
	 */
	getContextFromUri(uri: string): DocumentContext | undefined;

	/**
	 * Get the document context from a text document.
	 * @param document A text document.
	 * @param contextType The expected type of the document context.
	 * @returns A document context of the specified type if the document is loaded and matches the type, null otherwise.
	 */
	getContext<T extends DocumentContext>(document: vscode.TextDocument, contextType: new (...args: any[]) => T): T | null;

	/**
	 * Load a text document into a document context.
	 * @param document The text document to load.
	 * @param forceReload Indicates whether a new context should be created for existing contexts.
	 * @returns A promise that resolves to the document context or undefined if unsupported.
	 */
	loadDocument(document: vscode.TextDocument, forceReload?: boolean): Promise<DocumentContext | undefined>;

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
}
