import { mentor } from '@/mentor';
import { sparqlConnectionController } from '@/webviews/sparql-connection/sparql-connection-controller';

export const createSparqlConnection = async () => {
	const endpoint = await mentor.sparqlConnectionService.createConnection();

	sparqlConnectionController.edit(endpoint);
};