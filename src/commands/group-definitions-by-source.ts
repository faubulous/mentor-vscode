import { container } from '@src/service-container';
import { ServiceToken } from '@src/service-token';
import { DefinitionTreeLayout, SettingsService } from '@src/services/shared/settings-service';

export const groupDefinitionsBySource = {
	id: 'mentor.command.groupDefinitionsBySource',
	handler: () => {
		container.resolve<SettingsService>(ServiceToken.SettingsService).set('view.definitionTree.defaultLayout', DefinitionTreeLayout.BySource);
	}
};
