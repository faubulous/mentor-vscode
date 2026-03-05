import { container } from '@src/services/service-container';
import { ServiceToken, ISettingsService } from '@src/services';
import { DefinitionTreeLayout } from '@src/services/shared/settings-service';

export const groupDefinitionsBySource = {
	id: 'mentor.command.groupDefinitionsBySource',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.definitionTree.defaultLayout', DefinitionTreeLayout.BySource);
	}
};
