import { container } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { SettingsService, TreeLabelStyle } from '@src/services/shared/settings-service';

export const showAnnotatedLabels = {
	id: 'mentor.command.showAnnotatedLabels',
	handler: () => {
		container.resolve<SettingsService>(ServiceToken.SettingsService).set('view.definitionTree.labelStyle', TreeLabelStyle.AnnotatedLabels);
	}
};
