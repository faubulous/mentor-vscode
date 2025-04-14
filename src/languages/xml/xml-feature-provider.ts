import * as vscode from "vscode";
import { mentor } from "@/mentor";
import { getIriFromPrefixedName, NamespaceMap } from "@/utilities";
import { XmlDocument } from "./xml-document";

/**
 * Base class of feature providers for RDF/XML documents.
 */
export class XmlFeatureProvider {
	/**
	 * Get the full IRI of an attribute name or of a quoted string at the given position in the XML document.
	 * @param context A document context.
	 * @param position A position in the document.
	 * @returns A full IRI if found, `undefined` otherwise.
	 */
	getIriAtPosition(document: vscode.TextDocument, position: { line: number, character: number }): string | undefined {
		const context = mentor.getDocumentContext(document, XmlDocument);

		if (!context) {
			return;
		}

		const line = document.lineAt(position.line).text;

		if (!line) {
			return;
		}

		let result = this.getIriFromPrefixedName(line, position, context.namespaces);

		if (result) {
			return result;
		}

		const value = this.getXmlAttributeValue(line, position);

		if (value) {
			return context.getIriFromXmlString(value);
		}
	}

	/**
	 * Get the value of a quoted string in the XML document at the given position wihtout quotation marks.
	 * @param line A line of text in the XML document.
	 * @param position The position where to look for the attribute value.
	 * @returns The value of a quoted string if found, `undefined` otherwise.
	 */
	protected getXmlAttributeValue(line: string, position: { line: number, character: number }): string | undefined {
		// Match quoted values (e.g., "http://example.org/C1_Test")
		const quotedValueExpression = /["']([^"']+)["']/g;

		let match: RegExpExecArray | null;

		while ((match = quotedValueExpression.exec(line)) !== null) {
			const start = match.index + 1;
			const end = start + match[1].length;

			if (position.character >= start && position.character <= end) {
				return match[1];
			}
		}
	}

	/**
	 * Get the full IRI from an attribute name at the given position in the XML document.
	 * @param line A line of text in the XML document.
	 * @param position The position where to look for the attribute value.
	 * @param namespaces The namespaces defined in the document.
	 * @returns A full IRI if found, `undefined` otherwise.
	 */
	protected getIriFromPrefixedName(line: string, position: { line: number, character: number }, namespaces: NamespaceMap): string | undefined {
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
}