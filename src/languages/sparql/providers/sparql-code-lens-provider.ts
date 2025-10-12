import * as vscode from 'vscode';
import { mentor } from '@/mentor';

/**
 * Provides a CodeLens to display and change the current SPARQL endpoint.
 */
export class SparqlCodeLensProvider implements vscode.CodeLensProvider {
	private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();

	public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

	constructor() {
		mentor.sparqlConnectionService.onDidChangeConnectionForDocument(() => {
			this.refresh();
		});
	}

	/**
	 * Computes the CodeLens for a given document.
	 * @param document The document to compute the CodeLens for.
	 * @returns A promise that resolves to an array of CodeLenses.
	 */
	public async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
		const connection = await mentor.sparqlConnectionService.getConnectionForDocument(document.uri);

		if (!connection) {
			return [];
		}

		const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));

		const codeLens = new vscode.CodeLens(range, {
			title: `${connection.endpointUrl}`,
			tooltip: 'Click to change the SPARQL endpoint for this file',
			command: 'mentor.command.selectSparqlConnection',
			arguments: [document],
		});

		return [codeLens];
	}

	/**
	 * Public method to manually trigger a refresh of the CodeLenses.
	 * This is useful after a command changes the source for a notebook.
	 */
	public refresh(): void {
		this._onDidChangeCodeLenses.fire();
	}
}