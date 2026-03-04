import { container } from '@src/container';
import { Settings } from '@src/settings';

export const hidePropertyTypes = {
	id: 'mentor.command.hidePropertyTypes',
	handler: () => {
		container.resolve(Settings).set('view.showPropertyTypes', false);
	}
};
