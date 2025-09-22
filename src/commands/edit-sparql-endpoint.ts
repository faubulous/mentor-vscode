import { SparqlConnection } from '@/services/sparql-connection';
import { sparqlEndpointController } from '@/webviews/sparql-endpoint/sparql-endpoint-controller';

export const editSparqlEndpoint = async (endpoint: SparqlConnection) => {
	sparqlEndpointController.open(endpoint);
};