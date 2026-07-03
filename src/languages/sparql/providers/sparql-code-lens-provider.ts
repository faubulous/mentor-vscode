import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService, ISparqlQueryService } from '@src/languages/sparql/services';
import { ITripleStoreConfigService } from '@src/languages/sparql/services';
import { WORKSPACE_CONNECTION } from '../services/sparql-connection-service';
import { SparqlConnection } from '../services/sparql-connection';
import { isTemplate } from 'triplate';

/**
 * Provides a CodeLens to display and change the current SPARQL endpoint.
 */
export class SparqlCodeLensProvider implements vscode.CodeLensProvider {
	private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();

	private _connectionService: ISparqlConnectionService;

	private _storeConfigService: ITripleStoreConfigService;
	
	private _queryService: ISparqlQueryService;

	public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

	constructor() {
		this._connectionService = container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
		this._storeConfigService = container.resolve<ITripleStoreConfigService>(ServiceToken.StoreConfigService);
		this._queryService = container.resolve<ISparqlQueryService>(ServiceToken.SparqlQueryService);

		this._connectionService.onDidChangeConnectionForDocument(() => {
			this.refresh();
		});

		this._connectionService.onDidChangeConnections(() => {
			this.refresh();
		});
	}

	/**
	 * Computes the CodeLens for a given document.
	 * @param document The document to compute the CodeLens for.
	 * @returns A promise that resolves to an array of CodeLenses.
	 */
	public async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
		const connection = this._connectionService.getConnectionForDocument(document.uri);

		if (!connection) {
			return [];
		}

		const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 0));
		const codeLenses: vscode.CodeLens[] = [];

		// Run CodeLens, pushed first so it always leads the document-wide lens group. VS Code
		// does not merge same-range CodeLenses from multiple providers in provider-registration
		// order, so for `.sparql`-language Triplate templates this provider supplies the Run
		// lens itself (delegating to the template command) instead of relying on
		// TriplateCodeLensProvider's lens landing first, which empirically it doesn't.
		// Notebook cells have a native run button that outputs results inline; triggering a
		// run command from a cell document would route to the SPARQL results panel instead.
		if (document.uri.scheme !== 'vscode-notebook-cell') {
			if (isTemplate(document.getText())) {
				codeLenses.push(new vscode.CodeLens(range, {
					title: '$(play)\u00A0Run',
					tooltip: 'Render this template with parameter values',
					command: 'mentor.command.executeTriplateTemplate',
					arguments: [document.uri.toString()],
				}));
			} else {
				codeLenses.push(new vscode.CodeLens(range, {
					title: '$(play)\u00A0Run',
					command: 'mentor.command.executeSparqlQuery',
					tooltip: 'Execute this SPARQL query',
					arguments: [this._queryService.createQueryFromDocument(document)],
				}));
			}
		}

		// Connection CodeLens
		const connectionUrl = this._getConnectionLabel(connection);
		const connectionCodeLens = new vscode.CodeLens(range, {
			title: `$(arrow-swap)\u00A0Connection: ${connectionUrl}`,
			tooltip: 'Click to change the SPARQL endpoint for this file',
			command: 'mentor.command.selectSparqlConnection',
			arguments: [document],
		});

		codeLenses.push(connectionCodeLens);

		// Inference status CodeLens (only for connections that support inference)
		if (this._storeConfigService.supportsInference(connection)) {
			const inferenceEnabled = this._connectionService.getInferenceEnabledForDocument(document.uri);
			const inferenceIcon = inferenceEnabled ? '$(lightbulb-sparkle)' : '$(lightbulb)';
			const inferenceText = inferenceEnabled ? 'on' : 'off';
			const inferenceTooltip = inferenceEnabled
				? 'Inferred triples are included. Click to exclude them.'
				: 'Inferred triples are excluded. Click to include them.';

			const inferenceCodeLens = new vscode.CodeLens(range, {
				title: `${inferenceIcon}\u00A0Inference: ${inferenceText}`,
				tooltip: inferenceTooltip,
				command: 'mentor.command.toggleDocumentInference',
				arguments: [document.uri],
			});

			codeLenses.push(inferenceCodeLens);
		}

		// List Graphs CodeLens (only when a listGraphs query is configured for the connection)
		if (this._connectionService.getQueryTemplate(connection, 'listGraphs')) {
			codeLenses.push(new vscode.CodeLens(range, {
				title: '$(list-flat) List Graphs',
				tooltip: 'List the named graphs available on this connection',
				command: 'mentor.command.listGraphs',
				arguments: [connection],
			}));
		}

		return codeLenses;
	}

	private _getConnectionLabel(connection: SparqlConnection): string {
		if (connection.id === WORKSPACE_CONNECTION.id) {
			return connection.id;
		} else {
			return connection.endpointUrl;
		}
	}

	/**
	 * Public method to manually trigger a refresh of the CodeLenses.
	 * This is useful after a command changes the source for a notebook.
	 */
	public refresh(): void {
		this._onDidChangeCodeLenses.fire();
	}
}