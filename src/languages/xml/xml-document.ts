import * as vscode from 'vscode';
import { LanguageTagUsageStats, Store, VocabularyRepository } from '@faubulous/mentor-rdf';
import { IToken, RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { ISettingsService } from '@src/services/core';
import { DocumentContext } from '@src/services/document/document-context';
import { ITokenizedDocumentContext } from '@src/services/document/document-context.interface';
import { RangeIndex } from '@src/services/document/range-index';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { XmlParseResult } from '@src/languages/xml/xml-types';
import { XmlParser } from '@src/languages/xml/xml-parser';
import { getIriFromPrefixedName, getTextFingerprint } from '@src/utilities';
import { addLanguageTagUsage, replaceGraphQuads } from '@src/utilities/rdf';
import { getLog } from '@src/utilities/vscode/log';

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

	/**
	 * The fingerprint of the text that was last parsed without error, or `undefined`. Lets
	 * the diagnostics pass recognize a text that is known to parse without keeping it.
	 */
	private _parsedTextFingerprint: string | undefined;

	get isLoaded(): boolean {
		return this._hasContent && this.graphs.length > 0;
	}

	get isParsed(): boolean {
		return this._hasContent;
	}

	isTokenized(): this is ITokenizedDocumentContext {
		return false;
	}

	constructor(uri: vscode.Uri, store: Store, vocabulary: VocabularyRepository, settings: ISettingsService) {
		super(uri, store, vocabulary, settings);

		this.syntax = RdfSyntax.RdfXml;
	}

	parse(text: string): IToken[] {
		this._parsedTextFingerprint = undefined;

		this.setParsedData(new XmlParser().parse(text));

		this._parsedTextFingerprint = getTextFingerprint(text);

		// RDF/XML documents are parsed structurally, not tokenized.
		return [];
	}

	/**
	 * Indicates whether the given text is the text that was last parsed without error.
	 * @param text A text.
	 */
	isParsedFrom(text: string): boolean {
		return this._parsedTextFingerprint !== undefined && this._parsedTextFingerprint === getTextFingerprint(text);
	}

	/**
	 * Set the parsed data of the document and update the derived indexes.
	 * @param data The parsed document data.
	 */
	setParsedData(data: XmlParseResult): void {
		this.baseIri = data.baseIri;
		this.namespaces = data.namespaces;
		// The parser result is transient; the context keeps the ranges packed.
		this.namespaceDefinitions = RangeIndex.fromRecord(data.namespaceDefinitions);
		this.subjects = RangeIndex.fromRecord(data.subjects);
		this.references = RangeIndex.fromRecord(data.references);
		this.typeAssertions = RangeIndex.fromRecord(data.typeAssertions);
		this.typeDefinitions = RangeIndex.fromRecord(data.typeDefinitions);
		this._textLiterals = data.textLiteralRanges.map(r => new vscode.Range(
			new vscode.Position(r.start.line, r.start.character),
			new vscode.Position(r.end.line, r.end.character)
		));

		// The xml namespace is implicitly defined in RDF/XML.
		if (!this.namespaces['xml']) {
			this.namespaces['xml'] = 'http://www.w3.org/XML/1998/namespace#';
		}

		this._hasContent = true;
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
		const reasoner = this._store.reasoner;

		if (reasoner && !this._inferenceExecuted) {
			this._inferenceExecuted = true;

			this._store.executeInference(WorkspaceUri.toCanonicalString(this.graphIri));
		}
	}

	/**
	 * Loads triples into the triple store.
	 * This method assumes parsed data has already been set via setParsedData().
	 * @param data The file content.
	 */
	override async loadTriples(data: string): Promise<void> {
		// Counted while the quads are added, instead of in a separate scan of the graph.
		const languageTagStats: LanguageTagUsageStats = {};

		const graphUri = WorkspaceUri.toCanonicalString(this.graphIri);

		// The graphs of a previous graph IRI, e.g. before a notebook cell got its slug.
		const previousGraphs = this.graphs.filter(uri => uri !== graphUri);

		// Initialize the graphs *before* trying to load the document so
		// that they are initialized even when loading the document fails.
		this.graphs.length = 0;
		this.graphs.push(graphUri);

		if (previousGraphs.length > 0) {
			this._store.deleteGraphs(previousGraphs, true);
		}

		// The RDF/XML parser writes into a store: parse into a separate one, so that
		// only the triples that changed are applied to the graph of the document.
		const parsed = new Store();

		try {
			await parsed.loadFromXmlStream(data, graphUri, false, true, quad => addLanguageTagUsage(languageTagStats, quad.object));
		} catch (e) {
			// This is not a critical error because the graph might be invalid. The
			// triples read before the error are loaded, as before.
			getLog().error('Failed to load triples from RDF/XML:', e);
		}

		const g = this._store.dataFactory.namedNode(graphUri);

		if (replaceGraphQuads(this._store, g, Array.from(parsed.matchQuads(null, null, null, g)))) {
			this._inferenceExecuted = false;
		}

		this.languageTagStats = languageTagStats;
	}
}