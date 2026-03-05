import { container } from '@src/service-container';
import { ServiceToken } from '@src/service-token';
import { SettingsService } from '@src/services/shared/settings-service';

export const hidePropertyTypes = {
	id: 'mentor.command.hidePropertyTypes',
	handler: () => {
		container.resolve<SettingsService>(ServiceToken.SettingsService).set('view.showPropertyTypes', false);
	}
};
