import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { SettingsService } from '@src/services/settings-service';

export const hideIndividualTypes = {
	id: 'mentor.command.hideIndividualTypes',
	handler: () => {
		container.resolve<SettingsService>(InjectionToken.SettingsService).set('view.showIndividualTypes', false);
	}
};
