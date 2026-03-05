import { container } from '@src/services/service-container';
import { ServiceToken, ISettingsService } from '@src/services';

export const hideIndividualTypes = {
	id: 'mentor.command.hideIndividualTypes',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showIndividualTypes', false);
	}
};
