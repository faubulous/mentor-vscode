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

		return this.getIriFromAttributeName(line, position, context.namespaces) ??
			this.getIriFromQuotedIri(line, position) ??
			this.getIriFromQuotedPrefixedName(line, position, context.namespaces) ??
			this.getIriFromQuotedLocalName(line, position, context.baseIri);
	}

	/**
	 * Get the full IRI from an attribute name at the given position in the XML document.
	 * @param line The line of text.
	 * @param character The character position.
	 * @param namespaces The namespaces defined in the document.
	 * @returns A full IRI if found, `undefined` otherwise.
	 */
	protected getIriFromAttributeName(line: string, position: { line: number, character: number }, namespaces: NamespaceMap): string | undefined {
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
	protected getIriFromQuotedIri(line: string, position: { line: number, character: number }): string | undefined {
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
	 * @param baseIri The base IRI of the document.
	 * @returns A full IRI string if the text at the position could be resolved against the provided `baseIri`, `undefined` otherwise.
	 */
	protected getIriFromQuotedLocalName(line: string, position: { line: number, character: number }, baseIri?: string): string | undefined {
		if (!baseIri) {
			return undefined;
		}

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

	/**
	 * Get the full IRI of quoted prefixed names at the given position in the XML document.
	 * @param document The text document.
	 * @param position The position in the document.
	 * @returns A full IRI if found, `undefined` otherwise.
	 */
	protected getIriFromQuotedPrefixedName(line: string, position: { line: number, character: number }, namespaces: NamespaceMap): string | undefined {
		// Match prefixed names in HTML entity coding (e.g., "&rdf;about")
		const prefixedNameExpression = /&([a-zA-Z_][\w.-]*);/g;

		let match: RegExpExecArray | null;

		while ((match = prefixedNameExpression.exec(line)) !== null) {
			const start = match.index + 1;
			const end = start + match[1].length;

			if (position.character >= start && position.character <= end) {
				return getIriFromPrefixedName(namespaces, match[1]);
			}
		}
	}
}