import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';
import { TreeLabelStyle } from '@src/services/core/settings-service';

export const showUriLabelsWithPrefix = {
	id: 'mentor.command.showUriLabelsWithPrefix',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.definitionTree.labelStyle', TreeLabelStyle.UriLabelsWithPrefix);
	}
};
