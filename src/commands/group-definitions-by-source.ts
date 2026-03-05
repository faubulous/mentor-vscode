import { container } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { ISettingsService } from '@src/services/interface';
import { DefinitionTreeLayout } from '@src/services/shared/settings-service';

export const groupDefinitionsBySource = {
	id: 'mentor.command.groupDefinitionsBySource',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.definitionTree.defaultLayout', DefinitionTreeLayout.BySource);
	}
};
