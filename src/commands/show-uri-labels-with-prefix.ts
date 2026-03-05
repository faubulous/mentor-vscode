import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { SettingsService, TreeLabelStyle } from '@src/services/settings-service';

export const showUriLabelsWithPrefix = {
	id: 'mentor.command.showUriLabelsWithPrefix',
	handler: () => {
		container.resolve<SettingsService>(InjectionToken.SettingsService).set('view.definitionTree.labelStyle', TreeLabelStyle.UriLabelsWithPrefix);
	}
};
