import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';
import { TreeLabelStyle } from '@src/services/core/settings-service';

export const showAnnotatedLabels = {
	id: 'mentor.command.showAnnotatedLabels',
	handler: () => {
		container.resolve<ISettingsService>(ServiceToken.SettingsService).set('view.definitionTree.labelStyle', TreeLabelStyle.AnnotatedLabels);
	}
};
