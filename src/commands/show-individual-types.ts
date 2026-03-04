import { container } from '@src/container';
import { Settings } from '@src/settings';

export const showIndividualTypes = {
	id: 'mentor.command.showIndividualTypes',
	handler: () => {
		container.resolve(Settings).set('view.showIndividualTypes', true);
	}
};
