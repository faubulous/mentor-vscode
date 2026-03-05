import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { SettingsService } from '@src/services/settings-service';

export const showPropertyTypes = {
	id: 'mentor.command.showPropertyTypes',
	handler: () => {
		container.resolve<SettingsService>(InjectionToken.SettingsService).set('view.showPropertyTypes', true);
	}
};
