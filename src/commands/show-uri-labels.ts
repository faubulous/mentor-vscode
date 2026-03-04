import { mentor } from '../mentor';
import { TreeLabelStyle } from '../settings';

export const showUriLabels = {
	id: 'mentor.command.showUriLabels',
	handler: () => {
		mentor.settings.set('view.definitionTree.labelStyle', TreeLabelStyle.UriLabels);
	}
};
