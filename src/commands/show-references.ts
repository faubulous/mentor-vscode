import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { SettingsService } from '@src/services/settings-service';

export const showReferences = {
	id: 'mentor.command.showReferences',
	handler: () => {
		container.resolve<SettingsService>(InjectionToken.SettingsService).set('view.showReferences', true);
	}
};
