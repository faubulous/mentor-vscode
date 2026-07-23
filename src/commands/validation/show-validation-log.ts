import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';

/**
 * Reveals the "Mentor Validation" log output channel, mirroring the indexer's
 * show-index-status command.
 */
export const showValidationLog = {
	id: 'mentor.command.showValidationLog',
	handler: () => {
		const service = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
		service.showLog();
	}
};
