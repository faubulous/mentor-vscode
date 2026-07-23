import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';
import { DefinitionTreeLayout } from '@src/services/core/settings-service';

export const groupDefinitionsByType = {
	id: 'mentor.command.groupDefinitionsByType',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.definitionTree.defaultLayout', DefinitionTreeLayout.ByType);
	}
};
