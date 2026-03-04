import { container } from '@src/container';
import { DefinitionTreeLayout, Settings } from '@src/settings';

export const groupDefinitionsByType = {
	id: 'mentor.command.groupDefinitionsByType',
	handler: () => {
		container.resolve(Settings).set('view.definitionTree.defaultLayout', DefinitionTreeLayout.ByType);
	}
};
