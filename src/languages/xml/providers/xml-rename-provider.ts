import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { XmlDocument } from '@/languages/xml/xml-document';
import { XmlFeatureProvider } from '@/languages/xml/xml-feature-provider';
import { getIriLocalPart, getNamespaceIri } from '@/utilities';

/**
 * Interface for regular expression based text replacements.
 */
interface TextReplacement {
	/**
	 * The regular expression to match the text to be replaced.
	 */
	fromExpression: RegExp;

	/**
	 * The replacement text.
	 */
	toValue: string;
}

/**
 * Provides renaming for URIs, resources labels and prefixes.
 */
export class XmlRenameProvider extends XmlFeatureProvider implements vscode.RenameProvider {

	public provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string): vscode.ProviderResult<vscode.WorkspaceEdit> {
		const context = mentor.getDocumentContext(document, XmlDocument);

		if (!context) {
			return undefined;
		}
		
		const edits = new vscode.WorkspaceEdit();

		// Handle rename of local names. Either of prefixed names or in IRIs.
		const nameRange = this._getLocalNameEditRange(document, position);

		if (nameRange && nameRange.contains(position)) {
			const iri = context.getIriAtPosition(position);

			if (!iri) {
				return undefined;
			}

			const replacements = this._getLocalNameTextReplacements(context, iri, newName);

			return this.getWorkspaceEdits(document, replacements);
		}

		// Handle rename of prefixes and prefix definitions.
		const prefixRange = this._getPrefixEditRange(document, position);

		if (prefixRange && prefixRange.contains(position)) {
			const prefix = document.getText(prefixRange);

			if (!context.namespaces[prefix]) {
				return undefined;
			}

			const replacements = this._getPrefixTextReplacements(context, prefix, newName);

			return this.getWorkspaceEdits(document, replacements);
		}

		return edits;
	}

	/**
	 * Get the workspace edits for the given text replacements.
	 * @param document The document to be edited.
	 * @param replacements The replacements to apply.
	 * @returns A workspace edit containing the replacements.
	 */
	getWorkspaceEdits(document: vscode.TextDocument, replacements: TextReplacement[]): vscode.WorkspaceEdit {
		const edits = new vscode.WorkspaceEdit();

		for (const replacement of replacements) {
			const documentText = document.getText();

			let match: RegExpExecArray | null;

			while ((match = replacement.fromExpression.exec(documentText)) !== null) {
				const matchIndex = match.index;
				const matchLength = match[0].length;

				const start = document.positionAt(matchIndex);
				const end = document.positionAt(matchIndex + matchLength);

				const range = new vscode.Range(start, end);

				edits.replace(document.uri, range, replacement.toValue);
			}
		}

		return edits;
	}

	/**
	 * Get the range of a prefix to be edited in the XML document at the given position.
	 * @param document The XML document.
	 * @param position The position where to look for the prefix.
	 * @returns The range of the prefix to be edited, or `undefined` if not found.
	 */
	private _getPrefixEditRange(document: vscode.TextDocument, position: vscode.Position): vscode.Range | undefined {
		const context = mentor.getDocumentContext(document, XmlDocument);

		if (!context) {
			return undefined;
		}

		const line = document.lineAt(position.line).text;
		const prefixedNameRange = context.getPrefixedNameRangeAtPosition(line, position);

		if (prefixedNameRange) {
			const prefixedName = document.getText(prefixedNameRange);

			if (prefixedName.startsWith('xmlns:')) {
				const start = prefixedNameRange.start.translate(0, 6);
				const end = prefixedNameRange.end;

				return new vscode.Range(start, end);
			} else {
				const start = prefixedNameRange.start;
				const end = prefixedNameRange.start.translate(0, prefixedName.indexOf(":"));

				return new vscode.Range(start, end);
			}
		}

		const attributeValueRange = context.getAttributeValueRangeAtPosition(line, position);

		if (attributeValueRange) {
			const attributeValue = document.getText(attributeValueRange);

			if (attributeValue.startsWith('&')) {
				const start = attributeValueRange.start.translate(0, 1);
				const end = attributeValueRange.end.translate(0, attributeValue.indexOf(";"));

				return new vscode.Range(start, end);
			}
		}

		const entityRange = context.getEntityRangeAtPosition(line, position);

		return entityRange;
	}

	/**
	 * Get the text replacements for a prefix in the XML document.
	 * @param context The XML document context.
	 * @param prefix The prefix to be replaced.
	 * @param newPrefix The new prefix to replace with.
	 * @returns An array of text replacements.
	 */
	private _getPrefixTextReplacements(context: XmlDocument, prefix: string, newPrefix: string): TextReplacement[] {
		const namespaceIri = context.namespaces[prefix];

		if (!namespaceIri) {
			return [];
		}

		const result: TextReplacement[] = [];

		result.push({
			fromExpression: new RegExp(`xmlns:${prefix}`, 'g'),
			toValue: `xmlns:${newPrefix}`
		});

		result.push({
			fromExpression: new RegExp(`${prefix}:`, 'g'),
			toValue: `${newPrefix}:`
		});

		result.push({
			fromExpression: new RegExp(`ENTITY ${prefix}`, 'g'),
			toValue: `ENTITY ${newPrefix}`
		});

		result.push({
			fromExpression: new RegExp(`&${prefix};`, 'g'),
			toValue: `&${newPrefix};`
		});

		return result;
	}

	/**
	 * Get the range of a local name to be edited in the XML document at the given position.
	 * @param document The XML document.
	 * @param position The position where to look for the local name.
	 * @returns The range of the local name to be edited, or `undefined` if not found.
	 */
	private _getLocalNameEditRange(document: vscode.TextDocument, position: vscode.Position): vscode.Range | undefined {
		const context = mentor.getDocumentContext(document, XmlDocument);

		if (!context) {
			return undefined;
		}

		const line = document.lineAt(position.line).text;
		const prefixedNameRange = context.getPrefixedNameRangeAtPosition(line, position);

		// Match XML prefixed attribute names (e.g. "rdf:about") which cannot occur inside attribute values.
		if (prefixedNameRange) {
			const prefixedName = document.getText(prefixedNameRange);

			if (!prefixedName.startsWith('xmlns:') && !prefixedName.startsWith('xml:')) {
				const start = prefixedNameRange.start.translate(0, prefixedName.indexOf(":") + 1);
				const end = prefixedNameRange.end;

				return new vscode.Range(start, end);
			}
		}

		const attributeValueRange = context.getAttributeValueRangeAtPosition(line, position);

		if (!attributeValueRange) {
			return undefined;
		}

		// Match entity references (e.g. "&ex;") inside attribute values.
		const attributeValue = document.getText(attributeValueRange);

		if (attributeValue.trim().startsWith('&')) {
			const startColumn = attributeValueRange.start.character + attributeValue.indexOf(";") + 1;
			const endColumn = attributeValueRange.start.character + attributeValue.length;

			return new vscode.Range(
				new vscode.Position(position.line, startColumn),
				new vscode.Position(position.line, endColumn)
			);
		}

		// Match local names (e.g. "Example") inside attribute values that must be resolved using the document base IRI.
		const attributeNameRange = context.getAttributeNameRangeNearPosition(line, position);
		const attributeName = document.getText(attributeNameRange);

		if (attributeName !== 'rdf:about' && attributeName !== 'rdf:resource' && attributeName !== 'rdf:datatype') {
			// We only support renaming of rdf:about, rdf:resource and rdf:datatype as these must be IRIs or local names.
			return undefined;
		}

		if (attributeValue.includes(':')) {
			// Attribute values only support 
			const localName = getIriLocalPart(attributeValue);

			if (localName.length === 0) {
				return undefined;
			}

			const startColumn = line.lastIndexOf(localName);
			const endColumn = line.lastIndexOf(localName) + localName.length;

			return new vscode.Range(
				new vscode.Position(position.line, startColumn),
				new vscode.Position(position.line, endColumn)
			);
		} else {
			// Local names which need to be resolved using the document base IRI.
			return attributeValueRange;
		}
	}

	/**
	 * Get the text replacements for a local name in the XML document.
	 * @param context The XML document context.
	 * @param iri The IRI which includes the local name to be replaced.
	 * @param newName The new local name to replace with.
	 * @returns An array of text replacements.
	 */
	private _getLocalNameTextReplacements(context: XmlDocument, iri: string, newName: string): TextReplacement[] {
		const localName = getIriLocalPart(iri);
		const namespaceIri = getNamespaceIri(iri);

		if (!iri.includes(':') || namespaceIri.length === 0 || localName.length === 0) {
			return [];
		}

		const result: TextReplacement[] = [];

		result.push({
			fromExpression: new RegExp(`${iri}`, 'g'),
			toValue: `${namespaceIri + newName}`
		});

		const prefix = context.getPrefixForNamespaceIri(namespaceIri);

		if (prefix) {
			result.push({
				fromExpression: new RegExp(`${prefix}:${localName}`, 'g'),
				toValue: `${prefix}:${newName}`
			});

			result.push({
				fromExpression: new RegExp(`&${prefix};${localName}`, 'g'),
				toValue: `&${prefix};${newName}`
			});
		}

		if (context.baseIri && iri.startsWith(context.baseIri)) {
			result.push({
				fromExpression: new RegExp(`="${localName}"`, 'g'),
				toValue: `="${newName}"`
			});
		}

		return result;
	}
}