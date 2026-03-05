import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { Settings } from '@src/settings';

export const hidePropertyTypes = {
	id: 'mentor.command.hidePropertyTypes',
	handler: () => {
		container.resolve<Settings>(InjectionToken.Settings).set('view.showPropertyTypes', false);
	}
};
