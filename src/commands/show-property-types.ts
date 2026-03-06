import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';

export const showPropertyTypes = {
	id: 'mentor.command.showPropertyTypes',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showPropertyTypes', true);
	}
};
