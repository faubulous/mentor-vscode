import { container } from 'tsyringe';
import { IWorkspaceFileService, IWorkspaceIndexerService } from '@src/services/core';
import { ServiceToken } from '@src/services/tokens';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { reportProfileValidation } from './shacl-validation-report';

/**
 * Validates every workspace file matched by a single validation profile against
 * that profile's shape graphs. Invoked from the play button on a profile row.
 */
export const validateProfile = {
	id: 'mentor.command.validateProfile',
	handler: async (profileId: string) => {
		if (!profileId) {
			return;
		}

		// Wait for background indexing so shape graphs and document contexts exist.
		const indexerService = container.resolve<IWorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);
		await indexerService.waitForIndexed();

		const validationService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
		const fileService = container.resolve<IWorkspaceFileService>(ServiceToken.WorkspaceFileService);

		// Progress and cancellation are shown on the validation status bar item; here we just
		// run the batch and report the final outcome. Explicit runs validate every matched
		// file regardless of size (skipLargeGraphs: false).
		const summary = await validationService.validateProfile(profileId, fileService.files, { skipLargeGraphs: false });

		await reportProfileValidation(summary, 'SHACL validation: no files match this profile.');
	}
};
