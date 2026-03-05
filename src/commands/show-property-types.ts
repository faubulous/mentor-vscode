import { container } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { SettingsService } from '@src/services/shared/settings-service';

export const showPropertyTypes = {
	id: 'mentor.command.showPropertyTypes',
	handler: () => {
		container.resolve<SettingsService>(ServiceToken.SettingsService).set('view.showPropertyTypes', true);
	}
};
