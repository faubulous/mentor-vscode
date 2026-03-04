import { container } from '@src/container';
import { DefinitionTreeLayout, Settings } from '@src/settings';

export const groupDefinitionsBySource = {
	id: 'mentor.command.groupDefinitionsBySource',
	handler: () => {
		container.resolve(Settings).set('view.definitionTree.defaultLayout', DefinitionTreeLayout.BySource);
	}
};
