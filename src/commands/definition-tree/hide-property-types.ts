import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';

export const hidePropertyTypes = {
	id: 'mentor.command.hidePropertyTypes',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showPropertyTypes', false);
	}
};
