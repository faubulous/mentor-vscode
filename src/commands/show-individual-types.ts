import { mentor } from '../mentor';

export const showIndividualTypes = {
	id: 'mentor.command.showIndividualTypes',
	handler: () => {
		mentor.settings.set('view.showIndividualTypes', true);
	}
};
