import { SparqlConnection } from '@src/services/shared/sparql-connection';
import { sparqlConnectionController } from '@src/views/webviews/sparql-connection/sparql-connection-controller';

export const editSparqlConnection = {
	id: 'mentor.command.editSparqlConnection',
	handler: async (endpoint: SparqlConnection) => {
		sparqlConnectionController.edit(endpoint);
	}
};