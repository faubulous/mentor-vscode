import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { Settings } from '@src/settings';

export const showPropertyTypes = {
	id: 'mentor.command.showPropertyTypes',
	handler: () => {
		container.resolve<Settings>(InjectionToken.Settings).set('view.showPropertyTypes', true);
	}
};
