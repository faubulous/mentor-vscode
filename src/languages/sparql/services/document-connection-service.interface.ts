import * as vscode from 'vscode';
import { SparqlConnection } from './sparql-connection';

/**
 * Manages the association of SPARQL connections and inference settings with
 * individual documents and notebook cells, including migrating those settings
 * across file renames and untitled-document saves.
 */
export interface IDocumentConnectionService {
	/**
	 * Event fired when the connection or inference setting for a document changes.
	 */
	readonly onDidChangeConnectionForDocument: vscode.Event<vscode.Uri>;

	/**
	 * Get the configured SPARQL connection for a specific document.
	 * @param documentIri The URI of the document or notebook cell.
	 * @returns The SPARQL connection or the Mentor Workspace triple store if no connection is found.
	 */
	getConnectionForDocument(documentIri: vscode.Uri | string): SparqlConnection;

	/**
	 * Returns the stored connection id of a document or notebook cell when that id no
	 * longer resolves to a registered connection (deleted, or defined in the user
	 * settings of another machine), so callers can surface that
	 * {@link getConnectionForDocument} fell back to the workspace store.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns The dangling connection id, or `undefined` when no binding is stored
	 * or the stored binding resolves.
	 */
	getUnresolvedConnectionId(documentUri: vscode.Uri): string | undefined;

	/**
	 * Sets the SPARQL connection for a specific document.
	 * @param documentUri The URI of the document or notebook cell.
	 * @param connectionId The ID of the connection to set.
	 */
	setQuerySourceForDocument(documentUri: vscode.Uri, connectionId: string): Promise<void>;

	/**
	 * Sets the connection for a specific notebook cell by editing its metadata.
	 * @param cellUri The URI of the notebook cell.
	 * @param connectionId The ID of the connection to set.
	 */
	setConnectionForCell(cellUri: vscode.Uri, connectionId: string): Promise<void>;

	/**
	 * Sets the SPARQL connection for every cell of a notebook in one bulk metadata
	 * edit, then fires {@link onDidChangeConnectionForDocument} once per changed
	 * cell — URI-scoped consumers (e.g. the FROM-graph linter) resolve the event
	 * URI against cell documents, so a notebook-level notification would be lost.
	 * @param notebook The notebook document.
	 * @param connectionId The ID of the connection to set.
	 * @returns The cells whose metadata was changed.
	 */
	setConnectionForNotebook(notebook: vscode.NotebookDocument, connectionId: string): Promise<vscode.NotebookCell[]>;

	/**
	 * Sets the inference setting for every cell of a notebook in one bulk metadata
	 * edit, then fires {@link onDidChangeConnectionForDocument} once per changed cell.
	 * @param notebook The notebook document.
	 * @param inferenceEnabled `true`/`false` to set, `undefined` to clear the cell setting.
	 * @returns The cells whose metadata was changed.
	 */
	setInferenceEnabledForNotebook(notebook: vscode.NotebookDocument, inferenceEnabled: boolean | undefined): Promise<vscode.NotebookCell[]>;

	/**
	 * Notifies listeners that the connection or inference settings for a document have changed.
	 * Use this after bulk updates to cell metadata.
	 * @param documentUri The URI of the document that changed.
	 */
	notifyDocumentConnectionChanged(documentUri: vscode.Uri): void;

	/**
	 * Gets the effective inference setting for a document or notebook cell.
	 * Priority: document/cell setting → connection setting → global default.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns `true` if inference is enabled, `false` otherwise.
	 */
	getInferenceEnabledForDocument(documentUri: vscode.Uri): boolean;

	/**
	 * Sets the inference setting for a document or notebook cell.
	 * @param documentUri The URI of the document or notebook cell.
	 * @param inferenceEnabled `true` to enable inference, `false` to disable, `undefined` to clear.
	 */
	setInferenceEnabledForDocument(documentUri: vscode.Uri, inferenceEnabled: boolean | undefined): Promise<void>;

	/**
	 * Toggles the inference setting for a document or notebook cell.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns The new inference-enabled state.
	 */
	toggleInferenceEnabledForDocument(documentUri: vscode.Uri): Promise<boolean>;

	/**
	 * Updates all document-scoped workspace state keys (SPARQL connection and inference settings)
	 * when files or folders are renamed in the workspace.
	 * @param files The list of file rename events from `vscode.workspace.onDidRenameFiles`.
	 */
	handleFileRenames(files: ReadonlyArray<{ oldUri: vscode.Uri; newUri: vscode.Uri }>): Promise<void>;
}
