import { sparqlConnectionsListController } from '@src/views/webviews/sparql-connections-list/sparql-connections-list-controller';

export const openConnectionsList = {
	id: 'mentor.command.openConnectionsList',
	handler: async () => {
		await sparqlConnectionsListController.open();
	}
};
