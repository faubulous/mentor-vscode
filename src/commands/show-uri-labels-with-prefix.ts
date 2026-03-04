import { mentor } from '../mentor';
import { TreeLabelStyle } from '../settings';

export const showUriLabelsWithPrefix = {
	id: 'mentor.command.showUriLabelsWithPrefix',
	handler: () => {
		mentor.settings.set('view.definitionTree.labelStyle', TreeLabelStyle.UriLabelsWithPrefix);
	}
};
