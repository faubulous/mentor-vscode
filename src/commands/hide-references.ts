import { container } from '@src/container';
import { Settings } from '@src/settings';

export const hideReferences = {
	id: 'mentor.command.hideReferences',
	handler: () => {
		container.resolve(Settings).set('view.showReferences', false);
	}
};
