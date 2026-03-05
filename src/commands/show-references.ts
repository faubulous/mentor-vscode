import { container } from '@src/container';
import { InjectionToken } from '@src/injection-token';
import { Settings } from '@src/settings';

export const showReferences = {
	id: 'mentor.command.showReferences',
	handler: () => {
		container.resolve<Settings>(InjectionToken.Settings).set('view.showReferences', true);
	}
};
