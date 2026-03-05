import { container } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { DefinitionTreeLayout, SettingsService } from '@src/services/shared/settings-service';

export const groupDefinitionsByType = {
	id: 'mentor.command.groupDefinitionsByType',
	handler: () => {
		container.resolve<SettingsService>(ServiceToken.SettingsService).set('view.definitionTree.defaultLayout', DefinitionTreeLayout.ByType);
	}
};
