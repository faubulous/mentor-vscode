import * as vscode from 'vscode';
import { container } from '@src/services/service-container';
import { ServiceToken } from '@src/services/service-token';
import { IDocumentContextService } from '@src/services/interface';

/**
 * A provider that retrieves the locations of resource references in a document.
 */
export class ReferenceProvider implements vscode.ReferenceProvider {
	private get contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	provideReferences(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Location[]> {
		const context = this.contextService.contexts[document.uri.toString()];

		if (!context) {
			return null;
		}

		const iri = context.getIriAtPosition(position);

		if (iri) {
			return this.provideReferencesForIri(iri);
		} else {
			return null;
		}
	}

	/**
	 * Get the locations of references for a given resource.
	 * @param iri The IRI of the resource.
	 * @returns The locations of the references.
	 */
	provideReferencesForIri(iri: string): vscode.Location[] {
		let result: vscode.Location[] = [];

		for (const context of Object.values(this.contextService.contexts)) {
			// Do not provide references for temporary, non-persisted git diff views or other in-memory documents.
			if (context.isTemporary || !context.references[iri]) {
				continue;
			}

			for (const range of context.references[iri]) {
				const r = new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character);

				result.push(new vscode.Location(context.uri, r));
			}
		}

		return result;
	}
}