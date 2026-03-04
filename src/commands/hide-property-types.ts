import { mentor } from '../mentor';

export const hidePropertyTypes = {
	id: 'mentor.command.hidePropertyTypes',
	handler: () => {
		mentor.settings.set('view.showPropertyTypes', false);
	}
};
