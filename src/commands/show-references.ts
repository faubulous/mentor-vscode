import { mentor } from '../mentor';

export const showReferences = {
	id: 'mentor.command.showReferences',
	handler: () => {
		mentor.settings.set('view.showReferences', true);
	}
};
