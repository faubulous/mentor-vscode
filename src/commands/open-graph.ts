import * as vscode from 'vscode';
import { mentor } from '@src/mentor';
import { SparqlConnection } from '@src/services/sparql-connection';
import { MENTOR_WORKSPACE_STORE } from '@src/services/sparql-connection-service';

const LARGE_GRAPH_THRESHOLD = 10000;

export const openGraph = {
	id: 'mentor.command.openGraph',
	handler: async (graphIri: vscode.Uri | string, connection?: SparqlConnection) => {
		const targetConnection = connection ?? MENTOR_WORKSPACE_STORE;

		try {
			// Check if the graph contains more than the threshold number of triples.
			const countQuery = `
				SELECT (COUNT(?s) as ?count)
				WHERE {
					SELECT ?s
					FROM <${graphIri.toString(true)}>
					WHERE {
						?s ?p ?o .
					}
					LIMIT ${LARGE_GRAPH_THRESHOLD}
				}
			`;

			const countResult = await mentor.sparqlQueryService.executeQueryOnConnection(countQuery, targetConnection);

			if (countResult?.type === 'bindings' && countResult.bindings.length > 0) {
				const countValue = countResult.bindings[0].get('count');
				const count = countValue ? parseInt(countValue.value, 10) : 0;

				if (count === LARGE_GRAPH_THRESHOLD) {
					const message = `The graph contains more than ${LARGE_GRAPH_THRESHOLD.toLocaleString()} triples. Exporting it may take some time. Do you want to continue?`;
					const answer = await vscode.window.showWarningMessage(message, { modal: true }, 'Continue');

					if (answer !== 'Continue') {
						return;
					}
				}
			}

			// Execute CONSTRUCT query to get the graph contents
			const constructQuery = `
				CONSTRUCT {
					?s ?p ?o .
				} WHERE {
					GRAPH <${graphIri.toString(true)}> {
						?s ?p ?o .
					}
				}`;

			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: 'Exporting graph...',
				cancellable: false
			}, async () => {
				const result = await mentor.sparqlQueryService.executeQueryOnConnection(constructQuery, targetConnection);

				if (result?.type === 'quads' && result.data) {
					const document = await vscode.workspace.openTextDocument({
						content: result.data,
						language: 'turtle'
					});

					vscode.window.showTextDocument(document);
				} else {
					vscode.window.showInformationMessage('The graph is empty or could not be exported.');
				}
			});
		} catch (error: any) {
			vscode.window.showErrorMessage(`Failed to open graph: ${error.message}`);
		}
	}
};