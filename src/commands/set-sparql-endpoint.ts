import * as vscode from 'vscode';
import { mentor } from '../mentor';

export const setSparqlEndpoint = async (document: vscode.TextDocument) => {
	if(!document) {
		vscode.window.showWarningMessage('No document valid was provided.');
		return;
	}

	// Show a quick pick to select from existing SPARQL connections
	const connections = await mentor.sparqlConnectionService.getConnections();

	if (connections.length === 0) {
		vscode.window.showWarningMessage('No SPARQL endpoints configured. Please add one first.');
		return;
	}

	const items = connections.map(connection => ({
		label: connection.label,
		description: connection.endpointUrl,
		connection: connection
	}));

	const selected = await vscode.window.showQuickPick(items, {
		placeHolder: 'Select a SPARQL endpoint',
	});

	if (!selected) return;

	await mentor.sparqlConnectionService.setQuerySourceForDocument(document.uri, selected.connection.id);
};