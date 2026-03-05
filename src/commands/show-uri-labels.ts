import { container } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { SettingsService, TreeLabelStyle } from '@src/services/shared/settings-service';

export const showUriLabels = {
	id: 'mentor.command.showUriLabels',
	handler: () => {
		container.resolve<SettingsService>(ServiceToken.SettingsService).set('view.definitionTree.labelStyle', TreeLabelStyle.UriLabels);
	}
};
