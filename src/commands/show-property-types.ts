import { mentor } from '../mentor';

export const showPropertyTypes = {
	id: 'mentor.command.showPropertyTypes',
	handler: () => {
		mentor.settings.set('view.showPropertyTypes', true);
	}
};
