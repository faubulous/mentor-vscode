import { container } from '@src/service-container';
import { ServiceToken } from '@src/service-token';
import { SettingsService } from '@src/services/shared/settings-service';

export const hideReferences = {
	id: 'mentor.command.hideReferences',
	handler: () => {
		container.resolve<SettingsService>(ServiceToken.SettingsService).set('view.showReferences', false);
	}
};
