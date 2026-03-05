import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { SettingsService, TreeLabelStyle } from '@src/services/settings-service';

export const showUriLabels = {
	id: 'mentor.command.showUriLabels',
	handler: () => {
		container.resolve<SettingsService>(InjectionToken.SettingsService).set('view.definitionTree.labelStyle', TreeLabelStyle.UriLabels);
	}
};
