import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/token';
import { ISettingsService } from '@src/services/interface';

export const showPropertyTypes = {
	id: 'mentor.command.showPropertyTypes',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showPropertyTypes', true);
	}
};
