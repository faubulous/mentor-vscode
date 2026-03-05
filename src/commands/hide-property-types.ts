import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { SettingsService } from '@src/services/settings-service';

export const hidePropertyTypes = {
	id: 'mentor.command.hidePropertyTypes',
	handler: () => {
		container.resolve<SettingsService>(InjectionToken.SettingsService).set('view.showPropertyTypes', false);
	}
};
