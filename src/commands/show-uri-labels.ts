import { container } from '@src/container';
import { Settings, TreeLabelStyle } from '@src/settings';

export const showUriLabels = {
	id: 'mentor.command.showUriLabels',
	handler: () => {
		container.resolve(Settings).set('view.definitionTree.labelStyle', TreeLabelStyle.UriLabels);
	}
};
