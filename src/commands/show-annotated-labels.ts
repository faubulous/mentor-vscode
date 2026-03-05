import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { Settings, TreeLabelStyle } from '@src/settings';

export const showAnnotatedLabels = {
	id: 'mentor.command.showAnnotatedLabels',
	handler: () => {
		container.resolve<Settings>(InjectionToken.Settings).set('view.definitionTree.labelStyle', TreeLabelStyle.AnnotatedLabels);
	}
};
