import { container } from 'tsyringe';
import { IWorkspaceFileService, IWorkspaceIndexerService } from '@src/services/core';
import { ServiceToken } from '@src/services/tokens';
import { DocumentDiagnosticsService } from '@src/services/document/document-diagnostics-service';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { reportProfileValidation } from './shacl-validation-report';

/**
 * Diagnoses the entire workspace: syntax and lint diagnostics for every indexed
 * file, followed by SHACL validation of all profiles. Auto-indexing skips
 * diagnostics to stay fast, so this is the explicit path to populate the
 * Problems panel workspace-wide. Invoked from the play button in the workspace
 * tree titlebar and from the settings panel.
 */
export const validateAllProfiles = {
	id: 'mentor.command.validateAllProfiles',
	handler: async () => {
		// Wait for background indexing so shape graphs and document contexts exist.
		const indexerService = container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);
		await indexerService.waitForIndexed();

		const fileService = container.resolve<IWorkspaceFileService>(ServiceToken.WorkspaceFileService);
		const diagnosticsService = container.resolve<DocumentDiagnosticsService>(ServiceToken.DocumentDiagnosticsService);
		const validationService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);

		// Syntax + lint diagnostics for the whole workspace. This opens each indexed
		// file on demand (the per-file cost that ordinary indexing avoids). Progress
		// is shown on the shared validation status bar item, which the SHACL phase
		// below then takes over.
		await diagnosticsService.diagnoseFiles(fileService.files, (processed, total) =>
			validationService.showRunningProgress(`$(sync~spin) Diagnosing: ${processed} of ${total} files...`)
		);

		// SHACL validation of all profiles. Progress and cancellation are shown on the
		// same validation status bar item. Explicit runs validate every matched file
		// regardless of size (skipLargeGraphs: false).
		const summary = await validationService.validateAllProfiles(fileService.files, { skipLargeGraphs: false });

		await reportProfileValidation(summary, 'SHACL validation: no files are covered by a validation profile.');
	}
};
