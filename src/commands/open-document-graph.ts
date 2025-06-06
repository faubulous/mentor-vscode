import * as vscode from 'vscode';
import { mentor } from '../mentor';

export async function openDocumentGraph() {
	const graphs = mentor.store.getGraphs();

	const quickPick = vscode.window.createQuickPick<vscode.QuickPickItem>();
	quickPick.title = 'Select the graph to open:';
	quickPick.items = graphs.map((graphIri) => {
		const n = [...mentor.store.matchAll(graphIri, null, null, null)].length;

		return {
			label: graphIri,
			description: `${n} triples`,
		};
	}).sort((a, b) => a.label.localeCompare(b.label));

	quickPick.onDidChangeSelection(async (selection) => {
		if (selection.length > 0) {
			const graphIri = selection[0].label;

			let document: vscode.TextDocument;

			if (graphIri.startsWith('file://')) {
				document = await vscode.workspace.openTextDocument(vscode.Uri.parse(graphIri));
			} else {
				const data = await mentor.store.serializeGraph(graphIri);

				document = await vscode.workspace.openTextDocument({ content: data, language: 'turtle' });
			}

			vscode.window.showTextDocument(document);
		}
	});

	quickPick.show();
}