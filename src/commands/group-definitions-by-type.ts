import { mentor } from '../mentor';
import { DefinitionTreeLayout } from '../settings';

export const groupDefinitionsByType = {
	id: 'mentor.command.groupDefinitionsByType',
	handler: () => {
		mentor.settings.set('view.definitionTree.defaultLayout', DefinitionTreeLayout.ByType);
	}
};
