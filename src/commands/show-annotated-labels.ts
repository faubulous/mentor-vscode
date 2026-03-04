import { container } from '@src/container';
import { Settings, TreeLabelStyle } from '@src/settings';

export const showAnnotatedLabels = {
	id: 'mentor.command.showAnnotatedLabels',
	handler: () => {
		container.resolve(Settings).set('view.definitionTree.labelStyle', TreeLabelStyle.AnnotatedLabels);
	}
};
