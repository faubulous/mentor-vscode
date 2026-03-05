import { container, ISettingsService } from '@src/services/service-container';
import { ServiceToken } from '@src/services';
import { DefinitionTreeLayout } from '@src/services/shared/settings-service';

export const groupDefinitionsByType = {
	id: 'mentor.command.groupDefinitionsByType',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.definitionTree.defaultLayout', DefinitionTreeLayout.ByType);
	}
};
