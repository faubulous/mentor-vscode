import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentConnectionService } from '@src/languages/sparql/services';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { ReferenceUpdateService } from './reference-update-service';

/**
 * Migrates per-document settings and updates the `workspace:` URI references in
 * indexed documents after files or folders were renamed in VS Code.
 * @param renames The rename events from `vscode.workspace.onDidRenameFiles`.
 */
export async function handleWorkspaceRenames(renames: ReadonlyArray<{ readonly oldUri: vscode.Uri; readonly newUri: vscode.Uri }>): Promise<void> {
	// Compute the reference changes first: they are derived from the indexed
	// contexts of the old files, which the workspace index removes once it has
	// processed the rename.
	const referenceUpdateService = container.resolve<ReferenceUpdateService>(ServiceToken.ReferenceUpdateService);
	const changes = referenceUpdateService.buildChangesForRenames(renames);

	// Migrate SPARQL workspaceState keys (document connection + inference settings).
	const documentConnectionService = container.resolve<IDocumentConnectionService>(ServiceToken.DocumentConnectionService);
	await documentConnectionService.handleFileRenames(renames);

	// Migrate SHACL workspace settings (profile shapes and document assignments).
	const shaclService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
	await shaclService.settingsSync.migrateShaclSettings(renames);

	// Update all workspace: URI references across indexed documents.
	await referenceUpdateService.batchUpdate(changes);
}
