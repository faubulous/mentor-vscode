import * as vscode from "vscode";
import { mentor } from "../mentor";

export class FeatureProvider {
	/**
	 * Get the document context from a text document.
	 * @param document A text document.
	 * @returns A document context if the document is loaded, null otherwise.
	 */
	protected getDocumentContext(document: vscode.TextDocument) {
		const uri = document.uri.toString();

		if (!mentor.contexts[uri]) {
			return null;
		}

		return mentor.contexts[uri];
	}
}