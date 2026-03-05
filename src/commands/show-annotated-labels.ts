import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { SettingsService, TreeLabelStyle } from '@src/services/settings-service';

export const showAnnotatedLabels = {
	id: 'mentor.command.showAnnotatedLabels',
	handler: () => {
		container.resolve<SettingsService>(InjectionToken.SettingsService).set('view.definitionTree.labelStyle', TreeLabelStyle.AnnotatedLabels);
	}
};
