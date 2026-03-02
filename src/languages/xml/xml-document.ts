import * as vscode from 'vscode';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { mentor } from '@src/mentor';
import { DocumentContext } from '@src/workspace/document-context';
import { XmlParseResult } from '@src/languages/xml/xml-types';
import { getIriFromPrefixedName } from '@src/utilities';

/**
 * A document context for RDF/XML documents.
 */
export class XmlDocument extends DocumentContext {
	readonly syntax: RdfSyntax;

	private _inferenceExecuted = false;

	/**
	 * Indicates whether parsed data has been received from the language server.
	 */
	private _hasContent = false;

	/**
	 * The ranges where text literals appear in the XML document.
	 */
	private _textLiterals: vscode.Range[] = [];

	constructor(uri: vscode.Uri) {
		super(uri);

		this.syntax = RdfSyntax.RdfXml;
	}

	get isLoaded(): boolean {
		return this._hasContent && this.graphs.length > 0;
	}

	/**
	 * Indicates whether parsed content has been received from the language server.
	 */
	get hasTokens(): boolean {
		return this._hasContent;
	}

	/**
	 * Set the parsed data from the language server.
	 * @param data The parsed document data.
	 */
	setParsedData(data: XmlParseResult): void {
		this.baseIri = data.baseIri;
		this.namespaces = data.namespaces;
		this.namespaceDefinitions = data.namespaceDefinitions;
		this.subjects = data.subjects;
		this.references = data.references;
		this.typeAssertions = data.typeAssertions;
		this.typeDefinitions = data.typeDefinitions;
		this._textLiterals = data.textLiteralRanges.map(r => new vscode.Range(
			new vscode.Position(r.start.line, r.start.character),
			new vscode.Position(r.end.line, r.end.character)
		));

		// The xml namespace is implicitly defined in RDF/XML.
		if (!this.namespaces['xml']) {
			this.namespaces['xml'] = 'http://www.w3.org/XML/1998/namespace#';
		}

		this._hasContent = true;

		console.debug('setParsedData:', this.uri.toString());
	}

	getIriFromXmlString(value: string): string | undefined {
		if (value.startsWith('&')) {
			const prefix = value.trim().split(';')[0].substring(1);
			const namespaceIri = this.namespaces[prefix];

			if (namespaceIri) {
				const localName = value.split(';')[1];

				return namespaceIri + localName;
			}
		}
		else if (value.startsWith('#') || !value.includes(':')) {
			return this.baseIri + value;
		} else if (value.length > 0) {
			const schemeOrPrefix = value.split(':')[0];

			if (this.namespaces[schemeOrPrefix]) {
				return this.namespaces[schemeOrPrefix] + value.split(':')[1];
			} else {
				return value;
			}
		}
	}

	override getIriAtPosition(position: { line: number, character: number }): string | undefined {
		const document = this.getTextDocument();

		if (!document) {
			return;
		}

		const line = document.lineAt(position.line).text;

		if (!line) {
			return;
		}

		const prefixRange = this.getPrefixedNameRangeAtPosition(line, position);

		if (prefixRange) {
			const name = document.getText(prefixRange);

			return getIriFromPrefixedName(this.namespaces, name);
		}

		const valueRange = this.getAttributeValueRangeAtPosition(line, position);

		if (valueRange) {
			const value = document.getText(valueRange);

			return this.getIriFromXmlString(value);
		}
	}

	override getLiteralAtPosition(position: vscode.Position): string | undefined {
		const document = this.getTextDocument();

		if (!document) {
			return;
		}

		for (const range of this._textLiterals) {
			const r = new vscode.Range(
				new vscode.Position(range.start.line, range.start.character),
				new vscode.Position(range.end.line, range.end.character),
			);

			if (r.contains(position)) {
				return document.getText(r);
			}

			if (r.start.line > position.line) {
				return undefined;
			}
		}
	}

	/**
	 * Get the (prefixed) name of an attribute in the XML document at the given position.
	 * @param line A line of text in the XML document.
	 * @param position The position where to look for the attribute value or name; should be within the attribute name or value.
	 * @returns The range in the document where the attribute name is found, 1-based for use with the vscode.TextDocument class.
	 */
	getAttributeNameRangeNearPosition(line: string, position: { line: number, character: number }): vscode.Range | undefined {
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
	getAttributeValueRangeAtPosition(line: string, position: { line: number, character: number }): vscode.Range | undefined {
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
	getPrefixedNameRangeAtPosition(line: string, position: { line: number, character: number }): vscode.Range | undefined {
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
	getEntityRangeAtPosition(line: string, position: { line: number, character: number }): vscode.Range | undefined {
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

	override async infer(): Promise<void> {
		const reasoner = mentor.store.reasoner;

		if (reasoner && !this._inferenceExecuted) {
			this._inferenceExecuted = true;

			mentor.store.executeInference(this.graphIri.toString());
		}
	}

	/**
	 * Loads triples into the triple store.
	 * This method assumes parsed data has already been set via setParsedData().
	 * @param data The file content.
	 */
	override async loadTriples(data: string): Promise<void> {
		try {
			const graphUri = this.graphIri.toString();

			// Initialize the graphs *before* trying to load the document so 
			// that they are initialized even when loading the document fails.
			this.graphs.length = 0;
			this.graphs.push(graphUri);

			// Load triples from the RDF/XML content into the store.
			await mentor.store.loadFromXmlStream(data, graphUri, false);
		} catch (e) {
			// This is not a critical error because the graph might be invalid.
			console.error('Failed to load triples from RDF/XML:', e);
		}
	}
}