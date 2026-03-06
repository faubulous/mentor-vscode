import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SparqlConnectionsListController } from '@src/views/webviews';

export const manageSparqlConnections = {
	id: 'mentor.command.manageSparqlConnections',
	handler: async () => {
		const controller = container.resolve<SparqlConnectionsListController>(ServiceToken.SparqlConnectionsListController);
		await controller.open();
	}
};
