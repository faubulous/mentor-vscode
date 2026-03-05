import { container } from '@src/services/service-container';
import { ServiceToken, ISettingsService } from '@src/services';

export const showReferences = {
	id: 'mentor.command.showReferences',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showReferences', true);
	}
};
