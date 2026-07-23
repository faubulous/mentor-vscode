import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';

export const hideReferences = {
	id: 'mentor.command.hideReferences',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showReferences', false);
	}
};
