import { container } from '@src/services/service-container';
import { ServiceToken, ISettingsService } from '@src/services';

export const hideReferences = {
	id: 'mentor.command.hideReferences',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showReferences', false);
	}
};
