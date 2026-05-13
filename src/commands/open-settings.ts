import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IViewRouter } from '@src/views/webviews';

export const openSettings = {
	id: 'mentor.command.openSettings',
	handler: async () => {
		const router = container.resolve<IViewRouter>(ServiceToken.WebviewRouter);
		await router.open({ kind: 'settings' });
	}
};
