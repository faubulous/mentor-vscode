import { container } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { ISettingsService } from '@src/services/interface';

export const showReferences = {
	id: 'mentor.command.showReferences',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showReferences', true);
	}
};
