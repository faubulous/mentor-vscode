import * as vscode from 'vscode';
import { mentor } from '@src/mentor';

export const openGraph = {
	id: 'mentor.command.openGraph',
	handler: async (graphIri: vscode.Uri | string) => {
		// TODO: Turn into a SPARQL query so this also works with SPARQL endpoints.
		const namespaces = mentor.prefixLookupService.getInferencePrefixes();
		const data = await mentor.store.serializeGraph(graphIri.toString(true), 'text/turtle', undefined, namespaces);
		const document = await vscode.workspace.openTextDocument({ content: data, language: 'turtle' });

		vscode.window.showTextDocument(document);
	}
};