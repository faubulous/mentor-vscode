import { container } from '@src/services/service-container';
import { ServiceToken, ISettingsService } from '@src/services';
import { TreeLabelStyle } from '@src/services/shared/settings-service';

export const showUriLabelsWithPrefix = {
	id: 'mentor.command.showUriLabelsWithPrefix',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.definitionTree.labelStyle', TreeLabelStyle.UriLabelsWithPrefix);
	}
};
