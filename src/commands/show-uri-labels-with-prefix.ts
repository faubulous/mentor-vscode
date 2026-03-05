import { container } from '@src/service-container';
import { ServiceToken } from '@src/service-token';
import { SettingsService, TreeLabelStyle } from '@src/services/settings-service';

export const showUriLabelsWithPrefix = {
	id: 'mentor.command.showUriLabelsWithPrefix',
	handler: () => {
		container.resolve<SettingsService>(ServiceToken.SettingsService).set('view.definitionTree.labelStyle', TreeLabelStyle.UriLabelsWithPrefix);
	}
};
