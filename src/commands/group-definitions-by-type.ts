import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { DefinitionTreeLayout, SettingsService } from '@src/services/settings-service';

export const groupDefinitionsByType = {
	id: 'mentor.command.groupDefinitionsByType',
	handler: () => {
		container.resolve<SettingsService>(InjectionToken.SettingsService).set('view.definitionTree.defaultLayout', DefinitionTreeLayout.ByType);
	}
};
