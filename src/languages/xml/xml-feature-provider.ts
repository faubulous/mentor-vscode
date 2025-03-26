import * as vscode from "vscode";
import { mentor } from "@/mentor";
import { getIriFromPrefixedName, NamespaceMap } from "@/utilities";
import { DocumentContext } from "@/document-context";

export class XmlFeatureProvider {
	/**
	 * Get the text document with the given URI.
	 * @param uri The URI of the text document.
	 * @returns The text document if it is loaded, null otherwise.
	 */
	protected getTextDocument(uri: vscode.Uri): vscode.TextDocument | undefined {
		return vscode.workspace.textDocuments.find(d => d.uri.toString() === uri.toString());
	}

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

	/**
	 * Get the full IRI of an attribute name or of a quoted string at the given position in the XML document.
	 * @param context A document context.
	 * @param position A position in the document.
	 * @returns A full IRI if found, `undefined` otherwise.
	 */
	protected getIriAtPosition(context: DocumentContext, position: vscode.Position): string | undefined {
		const document = this.getTextDocument(context.uri);

		if (!document) {
			return;
		}

		let result = this.getIriFromAttributeName(document, position, context.namespaces);

		if (!result) {
			result = this.getIriFromQuotedIri(document, position);
		}

		if (!result && context.baseIri) {
			result = this.getIriFromQuotedLocalName(document, position, context.baseIri);
		}

		return result;
	}

	/**
	 * Extracts the full attribute (e.g., xml:lang) at the given character position in a line of text.
	 * @param line The line of text.
	 * @param character The character position.
	 * @returns The full attribute or null if not found.
	 */
	protected getIriFromAttributeName(document: vscode.TextDocument, position: vscode.Position, namespaces: NamespaceMap): string | undefined {
		const line = document.lineAt(position.line).text;

		// Match namespace-prefixed attributes (e.g., xml:lang)
		const regex = /[a-zA-Z_][\w.-]*:[a-zA-Z_][\w.-]*/g;

		let match: RegExpExecArray | null;

		while ((match = regex.exec(line)) !== null) {
			const start = match.index;
			const end = start + match[0].length;

			if (position.character >= start && position.character <= end) {
				return getIriFromPrefixedName(namespaces, match[0]);
			}
		}
	}

	/**
	 * Get the full IRI of quoted attribute values at the given position in the XML document.
	 * @param document The text document.
	 * @param position The position in the document.
	 * @returns A full IRI if found, `undefined` otherwise.
	 */
	protected getIriFromQuotedIri(document: vscode.TextDocument, position: vscode.Position): string | undefined {
		const line = document.lineAt(position.line).text;

		// Match full IRIs in quotes (e.g., "http://example.org/C1_Test")
		const iriExpression = /["'](https?:\/\/[^\s"'<>)]+)["']/g;

		let match: RegExpExecArray | null;

		while ((match = iriExpression.exec(line)) !== null) {
			const start = match.index + 1;
			const end = start + match[1].length;

			if (position.character >= start && position.character <= end) {
				return match[1];
			}
		}
	}

	/**
	 * Get the full IRI of quoted local name values at the given position in the XML document.
	 * @param document The text document.
	 * @param position The position in the document.
	 * @returns A full IRI if found, `undefined` otherwise.
	 */
	protected getIriFromQuotedLocalName(document: vscode.TextDocument, position: vscode.Position, baseIri: string): string | undefined {
		const line = document.lineAt(position.line).text;

		// Match quoted local names (e.g., "C1_Test")
		const localNameExpression = /["']([^\s"'<>)]+)["']/g;

		let match: RegExpExecArray | null;

		while ((match = localNameExpression.exec(line)) !== null) {
			const start = match.index + 1;
			const end = start + match[1].length;

			if (position.character >= start && position.character <= end) {
				return new URL(match[1], baseIri).toString();
			}
		}
	}
}