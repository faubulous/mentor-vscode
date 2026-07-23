import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';
import { TreeLabelStyle } from '@src/services/core/settings-service';

export const showUriLabels = {
	id: 'mentor.command.showUriLabels',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.definitionTree.labelStyle', TreeLabelStyle.UriLabels);
	}
};
