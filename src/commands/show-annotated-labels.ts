import { container } from '@src/services/service-container';
import { ServiceToken, ISettingsService } from '@src/services';
import { TreeLabelStyle } from '@src/services/shared/settings-service';

export const showAnnotatedLabels = {
	id: 'mentor.command.showAnnotatedLabels',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.definitionTree.labelStyle', TreeLabelStyle.AnnotatedLabels);
	}
};
