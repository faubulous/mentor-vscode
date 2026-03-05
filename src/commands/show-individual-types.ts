import { container, ISettingsService } from '@src/services/service-container';
import { ServiceToken } from '@src/services';

export const showIndividualTypes = {
	id: 'mentor.command.showIndividualTypes',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showIndividualTypes', true);
	}
};
