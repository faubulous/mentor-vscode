import { container } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { ISettingsService } from '@src/services/interface';

export const hideReferences = {
	id: 'mentor.command.hideReferences',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showReferences', false);
	}
};
