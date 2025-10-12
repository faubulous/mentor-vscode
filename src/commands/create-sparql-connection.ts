import { mentor } from '@src/mentor';
import { sparqlConnectionController } from '@src/views/webviews/sparql-connection/sparql-connection-controller';

export const createSparqlConnection = async () => {
	const endpoint = await mentor.sparqlConnectionService.createConnection();

	sparqlConnectionController.edit(endpoint);
};