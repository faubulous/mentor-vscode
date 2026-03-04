import { mentor } from '../mentor';
import { TreeLabelStyle } from '../settings';

export const showAnnotatedLabels = {
	id: 'mentor.command.showAnnotatedLabels',
	handler: () => {
		mentor.settings.set('view.definitionTree.labelStyle', TreeLabelStyle.AnnotatedLabels);
	}
};
