import { container } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { ISettingsService } from '@src/services/interface';

export const hidePropertyTypes = {
	id: 'mentor.command.hidePropertyTypes',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showPropertyTypes', false);
	}
};
