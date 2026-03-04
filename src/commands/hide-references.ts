import { mentor } from '../mentor';

export const hideReferences = {
	id: 'mentor.command.hideReferences',
	handler: () => {
		mentor.settings.set('view.showReferences', false);
	}
};
