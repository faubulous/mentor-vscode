import * as vscode from "vscode";
import { mentor } from "@/mentor";
import { getIriFromPrefixedName } from "@/utilities";
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

		let prefixRange = this.getXmlPrefixedNameRangeAtPosition(line, position);

		if (prefixRange) {
			const name = document.getText(prefixRange);

			return getIriFromPrefixedName(context.namespaces, name);
		}

		const valueRange = this.getXmlAttributeValueRangeAtPosition(line, position);

		if (valueRange) {
			const value = document.getText(valueRange);

			return context.getIriFromXmlString(value);
		}
	}

	/**
	 * Get the (prefixed) name of an attribute in the XML document at the given position.
	 * @param line A line of text in the XML document.
	 * @param position The position where to look for the attribute value or name; should be within the attribute name or value.
	 * @returns The range in the document where the attribute name is found, 1-based for use with the vscode.TextDocument class.
	 */
	protected getXmlAttributeNameRangeNearPosition(line: string, position: { line: number, character: number }): vscode.Range | undefined {
		// Match an entire XML attribute (e.g., xml:example="Example")
		const attributeNameExpression = /(([a-zA-Z_][\w.-]*:)?[a-zA-Z_][\w.-]*)=["']([^"']+)["']/g;

		let match: RegExpExecArray | null;

		while ((match = attributeNameExpression.exec(line)) !== null) {
			const start = match.index;
			const end = start + match[1].length;

			// Check if the position is within the range of the entire attribute.
			if (position.character >= start && position.character <= match.index + match[0].length) {
				return new vscode.Range(
					new vscode.Position(position.line, start),
					new vscode.Position(position.line, end)
				);
			}
		}
	}

	/**
	 * Get the value of a quoted string in the XML document at the given position without quotation marks.
	 * @param line A line of text in the XML document.
	 * @param position The position where to look for the attribute value.
	 * @returns The range in the document where the attribute value is found if the position is within the value, `undefined` otherwise.
	 */
	protected getXmlAttributeValueRangeAtPosition(line: string, position: { line: number, character: number }): vscode.Range | undefined {
		// Match quoted values (e.g., "http://example.org/C1_Test")
		const quotedValueExpression = /["']([^"']+)["']/g;

		let match: RegExpExecArray | null;

		while ((match = quotedValueExpression.exec(line)) !== null) {
			const start = match.index + 1;
			const end = start + match[1].length;

			if (position.character >= start && position.character <= end) {
				return new vscode.Range(
					new vscode.Position(position.line, start),
					new vscode.Position(position.line, end)
				);
			}
		}
	}

	/**
	 * Get the range of a prefixed name (e.g. rdfs:label) in the XML document at the given position.
	 * @param line A line of text in the XML document.
	 * @param position The position where to look for the attribute value.
	 * @param namespaces The namespaces defined in the document.
	 * @returns The range in the document where the prefixed name is found if the position is within the name, `undefined` otherwise.
	 */
	protected getXmlPrefixedNameRangeAtPosition(line: string, position: { line: number, character: number }): vscode.Range | undefined {
		// Match namespace-prefixed attributes (e.g., xml:lang)
		const regex = /[a-zA-Z_][\w.-]*:[a-zA-Z_][\w.-]*/g;

		let match: RegExpExecArray | null;

		while ((match = regex.exec(line)) !== null) {
			const start = match.index;
			const end = start + match[0].length;

			if (position.character >= start && position.character <= end) {
				return new vscode.Range(
					new vscode.Position(position.line, start),
					new vscode.Position(position.line, end)
				);
			}
		}
	}

	/**
	 * Get the range of an XML entity name at the given position in the XML document.
	 * @param line A line of text in the XML document.
	 * @param position The position where to look for the entity name.
	 * @returns The range in the document where the entity name is found if the position is within the entity name, `undefined` otherwise.
	 */
	protected getXmlEntityRangeAtPosition(line: string, position: { line: number, character: number }): vscode.Range | undefined {
		const regex = /ENTITY ([a-zA-Z_][\w.-]*)/g;

		let match: RegExpExecArray | null;

		while ((match = regex.exec(line)) !== null) {
			const start = match.index + 7;
			const end = start + match[1].length;

			if (position.character >= start && position.character <= end) {
				return new vscode.Range(
					new vscode.Position(position.line, start),
					new vscode.Position(position.line, end)
				);
			}
		}
	}
}