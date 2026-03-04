import { container } from '@src/container';
import { Settings } from '@src/settings';

export const showPropertyTypes = {
	id: 'mentor.command.showPropertyTypes',
	handler: () => {
		container.resolve(Settings).set('view.showPropertyTypes', true);
	}
};
