import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IViewRouter } from '@src/views/webviews';
import { SettingsSectionId } from '@src/views/webviews/views/settings/sections';

export const openSettings = {
	id: 'mentor.command.openSettings',
	handler: async (section?: SettingsSectionId) => {
		const router = container.resolve<IViewRouter>(ServiceToken.WebviewRouter);
		await router.open({ kind: 'settings', section });
	}
};
