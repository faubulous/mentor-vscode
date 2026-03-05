import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/token';
import { ISettingsService } from '@src/services/interface';

export const showReferences = {
	id: 'mentor.command.showReferences',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showReferences', true);
	}
};
