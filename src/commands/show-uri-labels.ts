import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { Settings, TreeLabelStyle } from '@src/settings';

export const showUriLabels = {
	id: 'mentor.command.showUriLabels',
	handler: () => {
		container.resolve<Settings>(InjectionToken.Settings).set('view.definitionTree.labelStyle', TreeLabelStyle.UriLabels);
	}
};
