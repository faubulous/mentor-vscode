import * as vscode from 'vscode';
import { SparqlConnection } from './sparql-connection';
import { WORKSPACE_CONNECTION } from './workspace-store';
import { ISparqlConnectionRegistry } from './sparql-connection-registry.interface';
import { IDocumentConnectionService } from './document-connection-service.interface';

/**
 * Manages the association of SPARQL connections and inference settings with
 * individual documents and notebook cells. Document-scoped settings are stored
 * in workspace state; notebook cells carry them in their metadata so they travel
 * with the notebook. The service keeps those settings stable across file renames
 * and untitled-document saves, and inherits settings for newly added notebook cells.
 */
export class DocumentConnectionService implements IDocumentConnectionService {
	/**
	 * Workspace-state key prefix for per-document connection settings (`<prefix><documentUri>`).
	 */
	private readonly _documentConnectionStorageKeyPrefix = 'sparql.connection:';

	/**
	 * Workspace-state key prefix for per-document inference settings (`<prefix><documentUri>`).
	 */
	private readonly _documentInferenceStorageKeyPrefix = 'mentor.inference.document:';

	private _onDidChangeConnectionForDocument = new vscode.EventEmitter<vscode.Uri>();

	/**
	 * Fired when the active connection or inference setting for a document changes.
	 */
	public readonly onDidChangeConnectionForDocument = this._onDidChangeConnectionForDocument.event;

	/**
	 * Latest known text content of open (or recently open) untitled SPARQL documents, keyed by
	 * their untitled URI string. Maintained from `onDidOpenTextDocument` / `onDidChangeTextDocument`
	 * and seeded when a connection is set, because `onWillSaveTextDocument` does **not** fire for
	 * untitled documents being saved to disk for the first time. Used by `_migrateUntitledSave` to
	 * match a just-saved file back to the untitled document it came from so its per-document settings
	 * (connection, inference) can be migrated to the new file URI.
	 */
	private readonly _untitledSparqlSnapshots = new Map<string, string>();

	constructor(
		private readonly _extensionContext: vscode.ExtensionContext,
		private readonly _connectionRegistry: ISparqlConnectionRegistry
	) {
		vscode.workspace.onDidChangeNotebookDocument(async e => {
			for (const change of e.contentChanges) {
				if (change.addedCells.length > 0) {
					await this._inheritSettingsForNewCells(e.notebook, change.addedCells);
				}
			}
		});

		vscode.workspace.onDidOpenTextDocument(document => {
			this._snapshotUntitledSparqlDocument(document);
		});

		vscode.workspace.onDidChangeTextDocument(e => {
			this._snapshotUntitledSparqlDocument(e.document);
		});

		vscode.workspace.onDidSaveTextDocument(async document => {
			await this._migrateUntitledSave(document);
		});
	}

	/**
	 * Records the current text content of an untitled SPARQL document so it can later be matched
	 * to the on-disk file it is saved as. No-op for titled documents and non-SPARQL documents.
	 * @param document The document to snapshot.
	 */
	private _snapshotUntitledSparqlDocument(document: vscode.TextDocument): void {
		if (document.isUntitled && document.languageId === 'sparql') {
			this._untitledSparqlSnapshots.set(document.uri.toString(), document.getText());
		}
	}

	/**
	 * Migrates a just-saved document's per-document settings (connection, inference) from its
	 * previous untitled URI to its new on-disk URI, if it matches a tracked untitled document.
	 * Untitled documents have no `onDidRenameFiles` equivalent when saved to disk for the first
	 * time, and `onWillSaveTextDocument` does not fire for them, so the match is made by comparing
	 * the saved text content against snapshots captured while the document was still untitled.
	 * @param document The document that was just saved.
	 */
	private async _migrateUntitledSave(document: vscode.TextDocument): Promise<void> {
		if (document.isUntitled || document.languageId !== 'sparql') {
			return;
		}

		const content = document.getText();
		const match = [...this._untitledSparqlSnapshots].find(([, snapshot]) => snapshot === content);

		if (!match) {
			return;
		}

		const [oldUriStr] = match;
		this._untitledSparqlSnapshots.delete(oldUriStr);

		await this.handleFileRenames([{ oldUri: vscode.Uri.parse(oldUriStr), newUri: document.uri }]);
	}

	/**
	 * Inherits connection and inference settings for newly added notebook cells from the
	 * immediately preceding cell, so new cells start with the same context as their neighbour.
	 * @param notebook The notebook document that changed.
	 * @param addedCells The cells that were added.
	 */
	private async _inheritSettingsForNewCells(
		notebook: vscode.NotebookDocument,
		addedCells: readonly vscode.NotebookCell[]
	): Promise<void> {
		const cells = notebook.getCells();
		const edits: vscode.NotebookEdit[] = [];

		for (const addedCell of addedCells) {
			if (addedCell.metadata?.connectionId !== undefined || addedCell.metadata?.inferenceEnabled !== undefined) {
				continue;
			}

			let previousCell: vscode.NotebookCell | undefined;

			for (let i = addedCell.index - 1; i >= 0; i--) {
				previousCell = cells[i];
				break;
			}

			if (previousCell) {
				const inheritedMetadata: Record<string, unknown> = { ...addedCell.metadata };
				let hasInheritedSettings = false;

				if (typeof previousCell.metadata?.connectionId === 'string') {
					inheritedMetadata.connectionId = previousCell.metadata.connectionId;
					hasInheritedSettings = true;
				}

				if (typeof previousCell.metadata?.inferenceEnabled === 'boolean') {
					inheritedMetadata.inferenceEnabled = previousCell.metadata.inferenceEnabled;
					hasInheritedSettings = true;
				}

				if (hasInheritedSettings) {
					edits.push(vscode.NotebookEdit.updateCellMetadata(addedCell.index, inheritedMetadata));
				}
			}
		}

		if (edits.length > 0) {
			const workspaceEdit = new vscode.WorkspaceEdit();
			workspaceEdit.set(notebook.uri, edits);
			await vscode.workspace.applyEdit(workspaceEdit);
		}
	}

	/**
	 * Gets the effective inference setting for a document or notebook cell.
	 * Priority: document/cell setting → connection setting → global default.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns `true` if inference is enabled, `false` otherwise.
	 */
	getInferenceEnabledForDocument(documentUri: vscode.Uri): boolean {
		const documentSetting = documentUri.scheme === 'vscode-notebook-cell'
			? this._getInferenceEnabledForCell(documentUri)
			: this._extensionContext.workspaceState.get<boolean | undefined>(`${this._documentInferenceStorageKeyPrefix}${documentUri.toString()}`, undefined);

		if (documentSetting !== undefined) {
			return documentSetting;
		} else {
			const connection = this.getConnectionForDocument(documentUri);
			return this._connectionRegistry.getInferenceEnabled(connection.id);
		}
	}

	/**
	 * Reads the inference setting from a notebook cell's metadata.
	 * @param cellUri The URI of the notebook cell.
	 * @returns The cell-level inference setting, or `undefined` if not set.
	 */
	private _getInferenceEnabledForCell(cellUri: vscode.Uri): boolean | undefined {
		const notebook = this._getNotebookFromCellUri(cellUri);

		if (notebook) {
			const cell = notebook.getCells().find(cell => cell.document.uri.toString() === cellUri.toString());

			if (cell) {
				const inferenceEnabled = cell.metadata?.inferenceEnabled;

				if (typeof inferenceEnabled === 'boolean') {
					return inferenceEnabled;
				}
			}
		}

		return undefined;
	}

	/**
	 * Sets the inference setting for a document or notebook cell.
	 * @param documentUri The URI of the document or notebook cell.
	 * @param inferenceEnabled `true` to enable inference, `false` to disable, `undefined` to clear.
	 */
	async setInferenceEnabledForDocument(documentUri: vscode.Uri, inferenceEnabled: boolean | undefined): Promise<void> {
		if (documentUri.scheme === 'vscode-notebook-cell') {
			await this._setInferenceEnabledForCell(documentUri, inferenceEnabled);
		} else {
			const key = `${this._documentInferenceStorageKeyPrefix}${documentUri.toString()}`;
			await this._extensionContext.workspaceState.update(key, inferenceEnabled);
		}

		this._onDidChangeConnectionForDocument.fire(documentUri);
	}

	/**
	 * Sets the inference setting on a notebook cell's metadata.
	 * @param cellUri The URI of the notebook cell.
	 * @param inferenceEnabled The new inference setting, or `undefined` to clear.
	 * @throws If the notebook or the cell cannot be found.
	 */
	private async _setInferenceEnabledForCell(cellUri: vscode.Uri, inferenceEnabled: boolean | undefined): Promise<void> {
		const notebook = this._getNotebookFromCellUri(cellUri);

		if (!notebook) {
			throw new Error('Notebook document not found for the given cell URI: ' + cellUri.toString());
		}

		const cell = notebook.getCells().find(cell => cell.document.uri.toString() === cellUri.toString());

		if (!cell) {
			throw new Error('Cell not found in the notebook for the given cell URI: ' + cellUri.toString());
		}

		const metadata = { ...cell.metadata };

		if (inferenceEnabled === undefined) {
			delete metadata.inferenceEnabled;
		} else {
			metadata.inferenceEnabled = inferenceEnabled;
		}

		const workspaceEdit = new vscode.WorkspaceEdit();
		workspaceEdit.set(notebook.uri, [vscode.NotebookEdit.updateCellMetadata(cell.index, metadata)]);

		await vscode.workspace.applyEdit(workspaceEdit);
	}

	/**
	 * Toggles the inference setting for a document or notebook cell.
	 * @param documentUri The URI of the document or notebook cell.
	 * @returns The new inference-enabled state.
	 */
	async toggleInferenceEnabledForDocument(documentUri: vscode.Uri): Promise<boolean> {
		const newValue = !this.getInferenceEnabledForDocument(documentUri);

		await this.setInferenceEnabledForDocument(documentUri, newValue);

		return newValue;
	}

	/**
	 * Notifies listeners that the connection or inference settings for a document have changed.
	 * Use this after bulk updates to cell metadata.
	 * @param documentUri The URI of the document that changed.
	 */
	public notifyDocumentConnectionChanged(documentUri: vscode.Uri): void {
		this._onDidChangeConnectionForDocument.fire(documentUri);
	}

	/**
	 * Gets the configured SPARQL connection for a document or notebook cell.
	 * @param documentIri The URI of the document or notebook cell.
	 * @returns The associated connection, or the workspace store if none is set.
	 */
	getConnectionForDocument(documentIri: vscode.Uri | string): SparqlConnection {
		const uri = typeof documentIri === 'string' ? vscode.Uri.parse(documentIri) : documentIri;

		const connectionId = uri.scheme === 'vscode-notebook-cell'
			? this._getConnectionIdForCell(uri)
			: this._extensionContext.workspaceState.get<string>(`${this._documentConnectionStorageKeyPrefix}${uri.toString()}`);

		return this._connectionRegistry.getConnection(connectionId ?? '') ?? WORKSPACE_CONNECTION;
	}

	/**
	 * Reads the connection ID from a notebook cell's metadata.
	 * @param cellUri The URI of the notebook cell.
	 * @returns The connection ID, or `undefined` if none is set.
	 */
	private _getConnectionIdForCell(cellUri: vscode.Uri): string | undefined {
		const notebook = this._getNotebookFromCellUri(cellUri);

		if (notebook) {
			const cell = notebook.getCells().find(cell => cell.document.uri.toString() === cellUri.toString());

			if (cell) {
				const connectionId = cell.metadata?.connectionId;

				if (typeof connectionId === 'string') {
					return connectionId;
				}
			}
		}
	}

	/**
	 * Associates a SPARQL connection with a document or notebook cell.
	 * @param documentUri The URI of the document or notebook cell.
	 * @param connectionId The ID of the connection to set.
	 */
	async setQuerySourceForDocument(documentUri: vscode.Uri, connectionId: string): Promise<void> {
		if (documentUri.scheme === 'vscode-notebook-cell') {
			await this.setConnectionForCell(documentUri, connectionId);
		} else {
			this._extensionContext.workspaceState.update(`${this._documentConnectionStorageKeyPrefix}${documentUri.toString()}`, connectionId);

			if (documentUri.scheme === 'untitled') {
				const document = vscode.workspace.textDocuments.find(d => d.uri.toString() === documentUri.toString());

				if (document) {
					this._snapshotUntitledSparqlDocument(document);
				}
			}
		}

		this._onDidChangeConnectionForDocument.fire(documentUri);
	}

	/**
	 * Sets the connection for a specific notebook cell by editing its metadata.
	 * @param cellUri The URI of the notebook cell.
	 * @param connectionId The ID of the connection to set.
	 * @throws If the notebook or the cell cannot be found.
	 */
	async setConnectionForCell(cellUri: vscode.Uri, connectionId: string): Promise<void> {
		const notebook = this._getNotebookFromCellUri(cellUri);

		if (!notebook) {
			throw new Error('Notebook document not found for the given cell URI: ' + cellUri.toString());
		}

		const cell = notebook.getCells().find(cell => cell.document.uri.toString() === cellUri.toString());

		if (!cell) {
			throw new Error('Cell not found in the notebook for the given cell URI: ' + cellUri.toString());
		}

		const workspaceEdit = new vscode.WorkspaceEdit();
		workspaceEdit.set(notebook.uri, [vscode.NotebookEdit.updateCellMetadata(cell.index, { ...cell.metadata, connectionId })]);

		await vscode.workspace.applyEdit(workspaceEdit);
	}

	/**
	 * Finds the containing NotebookDocument for a given cell URI by matching paths.
	 * @param cellUri The URI of the notebook cell.
	 * @returns The containing notebook, or `undefined` if not found.
	 */
	private _getNotebookFromCellUri(cellUri: vscode.Uri): vscode.NotebookDocument | undefined {
		for (const notebook of vscode.workspace.notebookDocuments) {
			if (notebook.uri.path === cellUri.path) {
				return notebook;
			}
		}
	}

	/**
	 * Updates all document-scoped workspace state keys (SPARQL connection and inference settings)
	 * when files or folders are renamed in the workspace.
	 *
	 * Both prefixes use the full absolute `file://` URI as the key suffix. For folder renames the
	 * match is done by URI prefix (with a trailing `/` guard to avoid accidentally matching sibling
	 * folders that share a common name prefix).
	 *
	 * Notebook cell settings are stored in cell metadata and travel with the notebook automatically —
	 * they do not need to be migrated here.
	 *
	 * @param files The list of file rename events from `vscode.workspace.onDidRenameFiles`.
	 */
	async handleFileRenames(files: ReadonlyArray<{ oldUri: vscode.Uri; newUri: vscode.Uri }>): Promise<void> {
		const prefixes = [
			this._documentConnectionStorageKeyPrefix,
			this._documentInferenceStorageKeyPrefix,
		];

		for (const { oldUri, newUri } of files) {
			const oldUriStr = oldUri.toString();
			const newUriStr = newUri.toString();

			for (const key of this._extensionContext.workspaceState.keys()) {
				for (const prefix of prefixes) {
					if (!key.startsWith(prefix)) {
						continue;
					}

					const uriPart = key.slice(prefix.length);

					const isMatch =
						uriPart === oldUriStr ||
						uriPart.startsWith(oldUriStr + '/');

					if (isMatch) {
						const newKey = prefix + newUriStr + uriPart.slice(oldUriStr.length);
						const value = this._extensionContext.workspaceState.get(key);

						await this._extensionContext.workspaceState.update(newKey, value);
						await this._extensionContext.workspaceState.update(key, undefined);
					}
				}
			}
		}
	}
}
