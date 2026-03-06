import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';
import { DefinitionTreeLayout } from '@src/services/core/settings-service';

export const groupDefinitionsBySource = {
	id: 'mentor.command.groupDefinitionsBySource',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.definitionTree.defaultLayout', DefinitionTreeLayout.BySource);
	}
};
