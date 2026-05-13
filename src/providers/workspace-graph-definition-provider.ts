import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContextService } from '@src/services/document';

/**
 * A definition provider that navigates to workspace documents or notebook cells
 * when the cursor is on a `workspace:` graph IRI (e.g. in a SPARQL `FROM` or
 * `GRAPH` clause, or a Turtle `<workspace:///…>` reference).
 */
export class WorkspaceGraphDefinitionProvider implements vscode.DefinitionProvider {
	private get _contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	provideDefinition(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Definition> {
		const context = this._contextService.contexts[document.uri.toString()];

		if (!context) {
			return null;
		}

		const iri = context.getIriAtPosition(position);

		if (!iri || !iri.startsWith('workspace:')) {
			return null;
		}

		for (const ctx of Object.values(this._contextService.contexts)) {
			if (ctx.graphIri.toString() === iri) {
				return new vscode.Location(ctx.uri, new vscode.Range(0, 0, 0, 0));
			}
		}

		return null;
	}
}
