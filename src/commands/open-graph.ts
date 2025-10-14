import * as n3 from 'n3';
import * as vscode from 'vscode';
import { NamedNode } from '@rdfjs/types';
import { mentor } from '@src/mentor';

const { namedNode } = n3.DataFactory;

export const openGraph = {
	id: 'mentor.command.openGraph',
	handler: async (graphIri: vscode.Uri) => {
		const prefixes: { [prefix: string]: NamedNode } = {};

		for (const [prefix, iri] of Object.entries(mentor.prefixLookupService.getInferencePrefixes())) {
			prefixes[prefix] = namedNode(iri);
		}

		const data = await mentor.store.serializeGraph(graphIri.toString(true), prefixes);
		const document = await vscode.workspace.openTextDocument({ content: data, language: 'turtle' });

		vscode.window.showTextDocument(document);
	}
};	