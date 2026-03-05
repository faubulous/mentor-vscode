import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { DefinitionTreeLayout, SettingsService } from '@src/services/settings-service';

export const groupDefinitionsBySource = {
	id: 'mentor.command.groupDefinitionsBySource',
	handler: () => {
		container.resolve<SettingsService>(InjectionToken.SettingsService).set('view.definitionTree.defaultLayout', DefinitionTreeLayout.BySource);
	}
};
