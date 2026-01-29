import * as vscode from 'vscode';
import { mentor } from '@src/mentor';
import { SparqlConnection } from '@src/services/sparql-connection';
import { sparqlResultsController } from '@src/views/webviews/sparql-results/sparql-results-controller';

/**
 * Default SPARQL query to retrieve all named graphs and the default graph that contain triples.
 */
const DEFAULT_LIST_GRAPHS_QUERY = `SELECT DISTINCT ?graph (COUNT(*) AS ?triples)
WHERE {
  {
    GRAPH ?graph { ?s ?p ?o }
  }
  UNION
  {
    ?s ?p ?o
    FILTER NOT EXISTS { GRAPH ?g { ?s ?p ?o } }
    BIND("default" AS ?graph)
  }
}
GROUP BY ?graph
ORDER BY DESC(?triples)`;

export const listGraphs = {
    id: 'mentor.command.listGraphs',
    handler: async (connection: SparqlConnection): Promise<void> => {
        const query = mentor.configuration.get<string>('sparql.listGraphsQuery', DEFAULT_LIST_GRAPHS_QUERY);;

        // Create an untitled SPARQL document with the list graphs query
        const document = await vscode.workspace.openTextDocument({
            content: query,
            language: 'sparql'
        });

        // Set the connection for this document
        await mentor.sparqlConnectionService.setQuerySourceForDocument(document.uri, connection.id);

        // Show the document and execute the query
        await vscode.window.showTextDocument(document);
        await sparqlResultsController.executeQueryFromTextDocument(document);
    }
};
