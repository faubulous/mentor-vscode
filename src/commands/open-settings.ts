import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SettingsPanelController } from '@src/views/webviews/settings/settings-panel-controller';

export const openSettings = {
	id: 'mentor.command.openSettings',
	handler: async () => {
		const controller = container.resolve<SettingsPanelController>(ServiceToken.SettingsPanelController);
		await controller.show();
	}
};
