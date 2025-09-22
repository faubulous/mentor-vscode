import { SparqlConnection } from '@/services/sparql-connection';
import { sparqlEndpointPanel } from '@/webviews/sparql-endpoint/sparql-endpoint-panel';

export const editSparqlEndpoint = async (endpoint: SparqlConnection) => {
	sparqlEndpointPanel.show(endpoint);
};