import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/token';
import { ISettingsService } from '@src/services/interface';

export const hideIndividualTypes = {
	id: 'mentor.command.hideIndividualTypes',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showIndividualTypes', false);
	}
};
