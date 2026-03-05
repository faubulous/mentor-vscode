import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { Settings } from '@src/settings';

export const showIndividualTypes = {
	id: 'mentor.command.showIndividualTypes',
	handler: () => {
		container.resolve<Settings>(InjectionToken.Settings).set('view.showIndividualTypes', true);
	}
};
