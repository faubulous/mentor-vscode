import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { IToken } from "millan";
import { DocumentContext } from "@/document-context";
import { getIriFromToken, getPrefixFromToken } from '@/utilities';
import { ReferenceProvider } from '@/providers';
import { TurtleDocument } from '@/languages/turtle/turtle-document';
import { TurtleFeatureProvider } from '@/languages/turtle/turtle-feature-provider';

/**
 * Provides references to resources.
 */
export class TurtleReferenceProvider extends TurtleFeatureProvider implements ReferenceProvider {
	provideReferences(document: vscode.TextDocument, position: vscode.Position): vscode.ProviderResult<vscode.Location[]> {
		const context = mentor.getDocumentContext(document, TurtleDocument);

		if (!context) {
			return null;
		}

		const token = context.getTokensAtPosition(position)[0];

		if (!token) {
			return null;
		}

		return this.provideReferencesForToken(context, position, token);
	}

	provideReferencesForToken(context: DocumentContext, position: vscode.Position, token: IToken) {
		let iri;

		if (this.isCursorOnPrefix(token, position)) {
			iri = context.namespaces[getPrefixFromToken(token)];
		} else {
			iri = getIriFromToken(context.namespaces, token);
		}

		if (!iri) {
			return null;
		}

		return this.provideReferencesForIri(iri);
	}

	provideReferencesForIri(iri: string): vscode.Location[] {
		let result: vscode.Location[] = [];

		for (const context of Object.values(mentor.contexts)) {
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