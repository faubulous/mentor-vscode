import { mentor } from '../mentor';

export const hideIndividualTypes = {
	id: 'mentor.command.hideIndividualTypes',
	handler: () => {
		mentor.settings.set('view.showIndividualTypes', false);
	}
};
