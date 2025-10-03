import { SparqlEndpoint } from '@/services/sparql-endpoint';
import { sparqlEndpointController } from '@/webviews/sparql-endpoint/sparql-endpoint-controller';

export const editSparqlEndpoint = async (endpoint: SparqlEndpoint) => {
	sparqlEndpointController.edit(endpoint);
};