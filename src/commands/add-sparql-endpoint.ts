import { sparqlEndpointController } from '@/webviews/sparql-endpoint/sparql-endpoint-controller';

export const addSparqlEndpoint = async () => {
	sparqlEndpointController.open(undefined);
};