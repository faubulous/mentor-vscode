import { sparqlConnectionsListController } from '@src/views/webviews/sparql-connections-list/sparql-connections-list-controller';

export const manageSparqlConnections = {
	id: 'mentor.command.manageSparqlConnections',
	handler: async () => {
		await sparqlConnectionsListController.open();
	}
};
