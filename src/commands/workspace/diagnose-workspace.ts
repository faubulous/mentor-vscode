import { container } from 'tsyringe';
import * as vscode from 'vscode';
import { IWorkspaceFileService, IWorkspaceIndexerService } from '@src/services/core';
import { ServiceToken } from '@src/services/tokens';
import { DocumentDiagnosticsService } from '@src/services/document/document-diagnostics-service';

/**
 * Runs syntax and lint diagnostics over every indexed workspace file, publishing
 * the results to the Problems panel. Unlike {@link validateAllProfiles} this does
 * not run SHACL validation — it is the syntax-only workspace check surfaced from
 * the indexing settings.
 */
export const diagnoseWorkspace = {
	id: 'mentor.command.diagnoseWorkspace',
	handler: async () => {
		// Wait for background indexing so the document contexts exist.
		const indexerService = container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);
		await indexerService.waitForIndexed();

		const fileService = container.resolve<IWorkspaceFileService>(ServiceToken.WorkspaceFileService);
		const diagnosticsService = container.resolve<DocumentDiagnosticsService>(ServiceToken.DocumentDiagnosticsService);

		// Opens each indexed file on demand (the per-file cost that ordinary indexing
		// avoids), so progress is shown as a background notification.
		await vscode.window.withProgress(
			{ location: vscode.ProgressLocation.Window, title: 'Mentor: Checking workspace syntax…' },
			async progress => {
				await diagnosticsService.diagnoseFiles(fileService.files, (processed, total) => {
					progress.report({ message: `${processed} of ${total} files` });
				});
			}
		);
	}
};
