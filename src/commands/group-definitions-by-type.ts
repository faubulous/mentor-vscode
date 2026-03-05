import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { DefinitionTreeLayout, Settings } from '@src/settings';

export const groupDefinitionsByType = {
	id: 'mentor.command.groupDefinitionsByType',
	handler: () => {
		container.resolve<Settings>(InjectionToken.Settings).set('view.definitionTree.defaultLayout', DefinitionTreeLayout.ByType);
	}
};
