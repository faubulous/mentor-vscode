import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { XmlDocument } from '@/languages/xml/xml-document';
import { XmlFeatureProvider } from '@/languages/xml/xml-feature-provider';

/**
 * Provides renaming for URIs, resources labels and prefixes.
 */
export class XmlRenameProvider extends XmlFeatureProvider implements vscode.RenameProvider {
	private readonly _debug = true;

	private _highlightRange(range: vscode.Range) {
		if (!this._debug) {
			return;
		}

		const editor = vscode.window.activeTextEditor;

		if (editor) {
			editor.setDecorations(vscode.window.createTextEditorDecorationType({
				backgroundColor: 'rgba(0, 0, 0, 0)',
			}), []);

			editor.setDecorations(vscode.window.createTextEditorDecorationType({
				backgroundColor: 'rgba(255, 255, 0, 0.3)',
			}), [range]);
		}
	}

	public async prepareRename(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Range | null> {
		const context = mentor.getDocumentContext(document, XmlDocument);

		if (!context) {
			return null;
		}

		let range = this.getPrefixEditRangeFromCursorPosition(document, position);

		if (range && range.contains(position)) {
			this._highlightRange(range);

			return range;
		}

		range = this.getLabelEditRangeFromCursorPosition(document, position);

		if (range && range.contains(position)) {
			this._highlightRange(range);

			return range;
		}

		return null;
	}

	public provideRenameEdits(document: vscode.TextDocument, position: vscode.Position, newName: string): vscode.ProviderResult<vscode.WorkspaceEdit> {
		const context = mentor.getDocumentContext(document, XmlDocument);

		if (!context) {
			return undefined;
		}

		const labelRange = this.getLabelEditRangeFromCursorPosition(document, position);

		if (labelRange && labelRange.contains(position)) {
			const iri = this.getIriAtPosition(document, position);

			if (!iri || !context.references[iri]) {
				return undefined;
			}

			const edits = new vscode.WorkspaceEdit();

			for (let r of context.references[iri]) {
				const editRange = this.getLabelEditRangeFromCursorPosition(document, new vscode.Position(r.end.line, r.end.character));

				if (!editRange) continue;

				edits.replace(document.uri, editRange, newName);
			}

			return edits;
		}

		const prefixRange = this.getPrefixEditRangeFromCursorPosition(document, position);
		const prefix = document.getText(prefixRange);

		if (!prefix || !context.namespaces[prefix]) {
			return undefined;
		}

		const edits = new vscode.WorkspaceEdit();

		for (const r of context.namespaceDefinitions[prefix]) {
			edits.replace(document.uri, new vscode.Range(
				new vscode.Position(r.start.line, r.start.character),
				new vscode.Position(r.end.line, r.end.character)
			), newName);
		}

		const namespaceIri = context.namespaces[prefix];

		for (const iri of Object.keys(context.references).filter(k => k.startsWith(namespaceIri))) {
			for (let r of context.references[iri]) {
				const editRange = this.getPrefixEditRangeFromCursorPosition(document, new vscode.Position(r.start.line, r.start.character));

				if (!editRange) continue;

				edits.replace(document.uri, editRange, newName);
			}
		}

		return edits;
	}

	getPrefixEditRangeFromCursorPosition(document: vscode.TextDocument, position: vscode.Position): vscode.Range | undefined {
		const line = document.lineAt(position.line).text;

		let result = this.getXmlPrefixedName(line, position);

		if (result) {
			const startColumn = line.indexOf(result);
			const endColumn = startColumn + result.indexOf(":");

			if (result.startsWith('xmlns:')) {
				return new vscode.Range(
					new vscode.Position(position.line, endColumn + 1),
					new vscode.Position(position.line, startColumn + result.length)
				);
			} else {
				return new vscode.Range(
					new vscode.Position(position.line, startColumn),
					new vscode.Position(position.line, endColumn)
				);
			}
		}

		result = this.getXmlAttributeValue(line, position);

		if (result && result.trim().startsWith('&')) {
			const startColumn = line.indexOf(result) + 1;
			const endColumn = line.indexOf(result) + result.indexOf(";");

			return new vscode.Range(
				new vscode.Position(position.line, startColumn),
				new vscode.Position(position.line, endColumn)
			);
		}
	}

	getLabelEditRangeFromCursorPosition(document: vscode.TextDocument, position: vscode.Position): vscode.Range | undefined {
		const line = document.lineAt(position.line).text;

		let result = this.getXmlPrefixedName(line, position);

		if (result) {
			const startColumn = line.indexOf(result) + result.indexOf(":") + 1;
			const endColumn = line.indexOf(result) + result.length;

			if (!result.startsWith('xmlns:') && !result.startsWith('xml:')) {
				return new vscode.Range(
					new vscode.Position(position.line, startColumn),
					new vscode.Position(position.line, endColumn)
				);
			}
		}

		result = this.getXmlAttributeValue(line, position);

		if (result) {
			// HTML entity-style prefixed names (e.g. "&rdf;about")
			if (result.trim().startsWith('&')) {
				const startColumn = line.indexOf(result) + result.indexOf(";") + 1;
				const endColumn = line.indexOf(result) + result.length;

				return new vscode.Range(
					new vscode.Position(position.line, startColumn),
					new vscode.Position(position.line, endColumn)
				);
			}

			// Relative IRIs that need to resolved using the document base IRI.
			const name = this.getXmlAttributeName(line, position)?.toLowerCase();

			if (name === 'rdf:about' || name === 'rdf:resource' || name === 'rdf:datatype') {
				const startColumn = line.indexOf(result);
				const endColumn = line.indexOf(result) + result.length;

				return new vscode.Range(
					new vscode.Position(position.line, startColumn),
					new vscode.Position(position.line, endColumn)
				);
			}
		}

		// TODO: Handle full IRIs in XML attributes.
	}
}