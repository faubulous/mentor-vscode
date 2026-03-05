import { container } from '@src/services/service-container';
import { ServiceToken, ISettingsService } from '@src/services';

export const showIndividualTypes = {
	id: 'mentor.command.showIndividualTypes',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showIndividualTypes', true);
	}
};
