import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/services/sparql';

/**
 * Provides a CodeLens to display and change the current SPARQL endpoint.
 */
export class SparqlCodeLensProvider implements vscode.CodeLensProvider {
	private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();

	public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

	constructor() {
		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);

		connectionService.onDidChangeConnectionForDocument(() => {
			this.refresh();
		});

		connectionService.onDidChangeConnections(() => {
			this.refresh();
		});
	}

	/**
	 * Computes the CodeLens for a given document.
	 * @param document The document to compute the CodeLens for.
	 * @returns A promise that resolves to an array of CodeLenses.
	 */
	public async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
		const connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
		const connection = await connectionService.getConnectionForDocument(document.uri);

		if (!connection) {
			return [];
		}

		const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
		const codeLenses: vscode.CodeLens[] = [];

		// Connection CodeLens
		const connectionCodeLens = new vscode.CodeLens(range, {
			title: `$(database)\u00A0${connection.endpointUrl}`,
			tooltip: 'Click to change the SPARQL endpoint for this file',
			command: 'mentor.command.selectSparqlConnection',
			arguments: [document],
		});

		codeLenses.push(connectionCodeLens);

		// Inference status CodeLens (only for connections that support inference)
		if (connectionService.supportsInference(connection)) {
			const inferenceEnabled = connectionService.getInferenceEnabledForDocument(document.uri);
			const inferenceIcon = inferenceEnabled ? '$(lightbulb-sparkle)' : '$(lightbulb-sparkle)';
			const inferenceText = inferenceEnabled ? 'on' : 'off';
			const inferenceTooltip = inferenceEnabled
				? 'Inferred triples are included. Click to exclude them.'
				: 'Inferred triples are excluded. Click to include them.';

			const inferenceCodeLens = new vscode.CodeLens(range, {
				title: `${inferenceIcon}\u00A0${inferenceText}`,
				tooltip: inferenceTooltip,
				command: 'mentor.command.toggleDocumentInference',
				arguments: [document.uri],
			});

			codeLenses.push(inferenceCodeLens);
		}

		return codeLenses;
	}

	/**
	 * Public method to manually trigger a refresh of the CodeLenses.
	 * This is useful after a command changes the source for a notebook.
	 */
	public refresh(): void {
		this._onDidChangeCodeLenses.fire();
	}
}