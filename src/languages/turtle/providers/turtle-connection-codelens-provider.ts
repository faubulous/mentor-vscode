import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISparqlConnectionService } from '@src/languages/sparql/services';
import { WORKSPACE_CONNECTION } from '@src/languages/sparql/services/sparql-connection-service';
import { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';

/**
 * Provides a CodeLens at the top of RDF documents to display and change the SPARQL connection
 * used to describe resources. Mirrors the connection lens of the SPARQL editor so that Turtle
 * documents have a visible, switchable, per-document connection.
 */
export class TurtleConnectionCodeLensProvider implements vscode.CodeLensProvider {
	private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();

	public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

	private _subscribed = false;

	private get _connectionService() {
		return container.resolve<ISparqlConnectionService>(ServiceToken.SparqlConnectionService);
	}

	/**
	 * Subscribe to connection changes lazily on first use, so that constructing this provider has no
	 * side effects (it is instantiated at module load, before the DI container may be configured).
	 */
	private _ensureSubscribed(): void {
		if (this._subscribed) {
			return;
		}

		this._subscribed = true;

		// Refresh the lens whenever the document's connection or the list of connections changes.
		this._connectionService.onDidChangeConnectionForDocument(() => this.refresh());
		this._connectionService.onDidChangeConnections(() => this.refresh());
	}

	public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
		this._ensureSubscribed();

		// Notebook cells show the connection via the cell toolbar; the slug lens owns the top row.
		if (document.uri.scheme === 'vscode-notebook-cell') {
			return [];
		}

		const connection = this._connectionService.getConnectionForDocument(document.uri);

		if (!connection) {
			return [];
		}

		const range = new vscode.Range(0, 0, 0, 0);

		return [
			new vscode.CodeLens(range, {
				title: `$(arrow-swap) Connection: ${this._getConnectionLabel(connection)}`,
				tooltip: 'Click to change the SPARQL endpoint used to describe resources in this file',
				command: 'mentor.command.selectSparqlConnection',
				arguments: [document],
			}),
		];
	}

	private _getConnectionLabel(connection: SparqlConnection): string {
		return connection.id === WORKSPACE_CONNECTION.id ? connection.id : connection.endpointUrl;
	}

	/**
	 * Manually trigger a refresh of the CodeLenses.
	 */
	public refresh(): void {
		this._onDidChangeCodeLenses.fire();
	}
}
