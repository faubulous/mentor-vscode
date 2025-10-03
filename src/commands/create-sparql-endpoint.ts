import { mentor } from '@/mentor';
import { sparqlEndpointController } from '@/webviews/sparql-endpoint/sparql-endpoint-controller';

export const createSparqlEndpoint = async () => {
	const endpoint = await mentor.sparqlEndpointService.createEndpoint();

	sparqlEndpointController.edit(endpoint);
};