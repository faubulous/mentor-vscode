import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { SettingsService } from '@src/services/settings-service';

export const showIndividualTypes = {
	id: 'mentor.command.showIndividualTypes',
	handler: () => {
		container.resolve<SettingsService>(InjectionToken.SettingsService).set('view.showIndividualTypes', true);
	}
};
