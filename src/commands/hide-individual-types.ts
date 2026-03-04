import { container } from '@src/container';
import { Settings } from '@src/settings';

export const hideIndividualTypes = {
	id: 'mentor.command.hideIndividualTypes',
	handler: () => {
		container.resolve(Settings).set('view.showIndividualTypes', false);
	}
};
