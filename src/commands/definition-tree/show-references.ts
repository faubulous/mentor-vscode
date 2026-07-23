import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';

export const showReferences = {
	id: 'mentor.command.showReferences',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.showReferences', true);
	}
};
