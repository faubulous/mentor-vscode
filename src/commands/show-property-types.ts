import { container, ISettingsService } from '@src/services/service-container';
import { ServiceToken } from '@src/services';

export const showPropertyTypes = {
	id: 'mentor.command.showPropertyTypes',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showPropertyTypes', true);
	}
};
