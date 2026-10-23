import * as vscode from 'vscode';
import { IDocumentConnectionService } from '@src/languages/sparql/services';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { ReferenceUpdateService } from './reference-update-service';

/**
 * A file or folder rename reported by `vscode.workspace.onDidRenameFiles`.
 */
type FileRename = { readonly oldUri: vscode.Uri; readonly newUri: vscode.Uri };

/**
 * Service that keeps per-document settings and `workspace:` URI references in sync with
 * files and folders that are renamed or deleted in VS Code.
 */
export class WorkspaceFileOperationService implements vscode.Disposable {
	/**
	 * The subscriptions to the workspace file operation events.
	 */
	private readonly _subscriptions: vscode.Disposable[] = [];

	/**
	 * @param _referenceUpdateService Updates the `workspace:` URI references of indexed documents.
	 * @param _documentConnectionService Stores the SPARQL connection settings of documents.
	 * @param _shaclValidationService Stores the SHACL validation settings of documents.
	 */
	constructor(
		private readonly _referenceUpdateService: ReferenceUpdateService,
		private readonly _documentConnectionService: IDocumentConnectionService,
		private readonly _shaclValidationService: ShaclValidationService
	) {
		this._subscriptions.push(
			vscode.workspace.onDidRenameFiles(e => this.handleRenames(e.files)),
			vscode.workspace.onDidDeleteFiles(e => this.handleDeletes(e.files))
		);
	}

	/**
	 * Migrates the per-document settings of renamed files and updates the `workspace:` URI
	 * references to them in the indexed documents.
	 * @param renames The renamed files and folders.
	 */
	async handleRenames(renames: ReadonlyArray<FileRename>): Promise<void> {
		// Compute the reference changes first: they are derived from the indexed
		// contexts of the old files, which the workspace index removes once it has
		// processed the rename.
		const changes = this._referenceUpdateService.buildChangesForRenames(renames);

		// Migrate SPARQL workspaceState keys (document connection + inference settings).
		await this._documentConnectionService.handleFileRenames(renames);

		// Migrate SHACL workspace settings (profile shapes and document assignments).
		await this._shaclValidationService.settingsSync.migrateShaclSettings(renames);

		// Update all workspace: URI references across indexed documents.
		await this._referenceUpdateService.batchUpdate(changes);
	}

	/**
	 * Prunes the SHACL assignments of deleted documents and warns about validation
	 * profiles that still reference deleted shape files.
	 * @param files The deleted files and folders.
	 */
	async handleDeletes(files: ReadonlyArray<vscode.Uri>): Promise<void> {
		await this._shaclValidationService.settingsSync.handleFileDeletes(files);
	}

	/**
	 * Unsubscribes from the workspace file operation events.
	 */
	dispose(): void {
		for (const subscription of this._subscriptions) {
			subscription.dispose();
		}

		this._subscriptions.length = 0;
	}
}
