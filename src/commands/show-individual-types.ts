import { container } from '@src/service-container';
import { ServiceToken } from '@src/service-token';
import { SettingsService } from '@src/services/shared/settings-service';

export const showIndividualTypes = {
	id: 'mentor.command.showIndividualTypes',
	handler: () => {
		container.resolve<SettingsService>(ServiceToken.SettingsService).set('view.showIndividualTypes', true);
	}
};
