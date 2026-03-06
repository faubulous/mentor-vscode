import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';

export const hideIndividualTypes = {
	id: 'mentor.command.hideIndividualTypes',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showIndividualTypes', false);
	}
};
