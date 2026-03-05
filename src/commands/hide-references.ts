import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/token';
import { ISettingsService } from '@src/services/interface';

export const hideReferences = {
	id: 'mentor.command.hideReferences',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showReferences', false);
	}
};
