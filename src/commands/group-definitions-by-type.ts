import { container } from '@src/service-container';
import { ServiceToken } from '@src/service-token';
import { DefinitionTreeLayout, SettingsService } from '@src/services/settings-service';

export const groupDefinitionsByType = {
	id: 'mentor.command.groupDefinitionsByType',
	handler: () => {
		container.resolve<SettingsService>(ServiceToken.SettingsService).set('view.definitionTree.defaultLayout', DefinitionTreeLayout.ByType);
	}
};
