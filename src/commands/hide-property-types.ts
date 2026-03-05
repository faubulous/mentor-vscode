import { container, ISettingsService } from '@src/services/service-container';
import { ServiceToken } from '@src/services';

export const hidePropertyTypes = {
	id: 'mentor.command.hidePropertyTypes',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showPropertyTypes', false);
	}
};
