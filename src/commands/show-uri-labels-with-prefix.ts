import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { Settings, TreeLabelStyle } from '@src/settings';

export const showUriLabelsWithPrefix = {
	id: 'mentor.command.showUriLabelsWithPrefix',
	handler: () => {
		container.resolve<Settings>(InjectionToken.Settings).set('view.definitionTree.labelStyle', TreeLabelStyle.UriLabelsWithPrefix);
	}
};
