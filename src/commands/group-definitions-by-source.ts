import { mentor } from '../mentor';
import { DefinitionTreeLayout } from '../settings';

export const groupDefinitionsBySource = {
	id: 'mentor.command.groupDefinitionsBySource',
	handler: () => {
		mentor.settings.set('view.definitionTree.defaultLayout', DefinitionTreeLayout.BySource);
	}
};
