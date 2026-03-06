import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';

export const showIndividualTypes = {
	id: 'mentor.command.showIndividualTypes',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showIndividualTypes', true);
	}
};
