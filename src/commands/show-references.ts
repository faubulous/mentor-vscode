import { container } from '@src/container';
import { Settings } from '@src/settings';

export const showReferences = {
	id: 'mentor.command.showReferences',
	handler: () => {
		container.resolve(Settings).set('view.showReferences', true);
	}
};
