import * as vscode from 'vscode';
import { Range } from 'vscode-languageserver-types';
import { SAXParser } from 'sax-ts';
import { _OWL, _RDF, _RDFS, _SH, _SKOS, _SKOS_XL, RdfSyntax } from '@faubulous/mentor-rdf';
import { mentor } from '@/mentor';
import { DocumentContext, TokenTypes } from '@/document-context';
import { getIriFromPrefixedName } from '@/utilities';

// TODO: Move getTokenTypes and getPrefixDefintion int the Definition Service for the XML language.

/**
 * A document context for RDF/XML documents.
 */
export class XmlDocument extends DocumentContext {
	readonly syntax: RdfSyntax;

	private _inferenceExecuted = false;

	/**
	 * The ranges where text literals appear in the XML document.
	 */
	private _textLiterals: vscode.Range[] = [];

	constructor(uri: vscode.Uri) {
		super(uri);

		this.syntax = RdfSyntax.RdfXml;
	}

	get isLoaded(): boolean {
		return this.graphs.length > 0;
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

	override getPrefixDefinition(prefix: string, uri: string, upperCase: boolean): string {
		return `xmlns:${prefix}="${uri}"`;
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

	override getTokenTypes(): TokenTypes {
		return {
			PREFIX: '',
			BASE: '',
			IRIREF: '',
			PNAME_NS: '',
		}
	}

	override async onDidChangeDocument(e: vscode.TextDocumentChangeEvent): Promise<void> {
		await super.onDidChangeDocument(e);

		const editor = vscode.window.activeTextEditor;
		const uri = editor?.document.uri;

		if (editor && uri === this.uri) {
			editor.setDecorations(vscode.window.createTextEditorDecorationType({
				backgroundColor: 'rgba(255, 255, 0, 0.3)',
			}), this._textLiterals);
		}
	}

	override async infer(): Promise<void> {
		const reasoner = mentor.store.reasoner;

		if (reasoner && !this._inferenceExecuted) {
			this._inferenceExecuted = true;

			mentor.store.executeInference(this.uri.toString());
		}
	}

	override async parse(uri: vscode.Uri, data: string): Promise<void> {
		try {
			const u = uri.toString();

			// Initialize the graphs *before* trying to load the document so 
			// that they are initialized even when loading the document fails.
			this.graphs.length = 0;
			this.graphs.push(u);

			// The loadFromStream function only updates the existing graphs 
			// when the document was parsed successfully.
			await mentor.store.loadFromXmlStream(data, u, false);

			await this.parseXml(data);

			// The xml namespace is implicitly defined in RDF/XML.
			if (!this.namespaces['xml']) {
				// Note: The official definition of the xml namespace omits the trailing hash (#).
				// However, without the trailing hash the links to the definitions do not work in practise.
				this.namespaces['xml'] = 'http://www.w3.org/XML/1998/namespace#';
			}
		} catch (e) {
			// This is not a critical error because the graph might be invalid.
		}
	}

	protected async parseXml(data: string): Promise<void> {
		const document = this.getTextDocument();

		if (!document) {
			return;
		}

		this._textLiterals = [];

		return new Promise((resolve, reject) => {
			const parser = new SAXParser(false, {
				trim: false,
				normalize: false,
				lowercase: true,
				xmlns: true,
				position: true,
			}) as SAXParser & { line: number; column: number };

			let openTag: SAXTag | undefined;
			let openTagStart: { line: number; column: number } | undefined;
			let openTagEnd: { line: number; column: number } | undefined;
			let textContent: string | undefined;
			let textContentEnd: { line: number; column: number } | undefined;

			parser.ondoctype = (doctype: string) => {
				this._parseDoctypePrefixDefinitions(doctype, parser.line);
			}

			// This event is fired before the onattribute event.
			parser.onopentagstart = (tag: SAXTag) => {
				openTag = tag;
				openTagStart = { line: parser.line, column: parser.column };

				// The tag name is lowercased by the parser so we need to lower case the line too.
				const line = document.lineAt(parser.line).text.toLowerCase();
				const column = line.indexOf(tag.name);

				if (column === -1) {
					return;
				}

				const range = new vscode.Range(
					new vscode.Position(parser.line, column),
					new vscode.Position(parser.line, column + tag.name.length)
				);

				if (range) {
					this._registerIriReferenceFromTagName(tag, range);
				}
			};

			parser.onopentag = (tag: SAXTag) => {
				openTagEnd = {
					line: parser.line,
					column: parser.column
				};

				if (openTagStart && tag.ns) {
					// Get the slice of 'data' between start tag line and the parser.line.
					for (let n = openTagStart?.line; n <= parser.line; n++) {
						const text = document.lineAt(n).text;

						this._registerXmlPrefixDefinition(text, n);
					}
				}
			}

			parser.ontext = (text: string) => {
				if (openTag && text.trim().length > 0) {
					textContent = text;
					textContentEnd = {
						line: parser.line,
						column: parser.column - openTag?.name.length - 3
					}
				} else {
					textContent = undefined;
					textEnd: undefined;
				}
			}

			parser.onclosetag = (tag: SAXTag) => {
				if (textContent && textContentEnd && openTagEnd) {
					this._textLiterals.push(new vscode.Range(
						new vscode.Position(openTagEnd.line, openTagEnd.column),
						new vscode.Position(textContentEnd.line, textContentEnd.column)
					));
				}
			}

			// This event is fired before the `onopentag` event.
			parser.onattribute = (attribute: SAXAttribute) => {
				if (attribute.name === 'xml:base') {
					this.baseIri = attribute.value;
				} else if (attribute.uri === _RDF) {
					// Note: The case of the attribute value is not modified by the parser.
					const line = document.lineAt(parser.line).text;
					const column = line.indexOf(attribute.value);

					if (column === -1) {
						return;
					}

					const range = new vscode.Range(
						new vscode.Position(parser.line, column),
						new vscode.Position(parser.line, column + attribute.value.length)
					);

					if (openTag && attribute.local === 'about') {
						this._registerTypedSubject(openTag, attribute, range);
					}

					switch (attribute.local) {
						case 'about':
						case 'resource':
						case 'datatype': {
							this._registerIriReferenceFromAttributeValue(attribute, range);
							break;
						}
					}
				}
			}

			parser.onerror = (error: any) => reject(error);
			parser.onend = () => resolve();

			parser.write(data).close();
		});
	}

	private _parseDoctypePrefixDefinitions(doctype: string, endLine: number) {
		const lines = doctype.split('\n');

		// Note: The parser provides the end position of the doctype declaration, but not the start position.
		const startLine = endLine - lines.length + 1;

		for (let n = lines.length - 1; n > 0; n--) {
			const text = lines[n];

			// Iterate over all the entity defintions in the string and register the ranges.
			const matches = text.matchAll(/<!ENTITY (\w+) "([^"]+)">/g);

			for (const match of matches) {
				const prefix = match[1];
				const namespaceIri = match[2];

				if (!this.namespaceDefinitions[prefix]) {
					this.namespaceDefinitions[prefix] = [];
				}

				// This accounts for multiple whitespaces after <!ENTITY
				// The prefix will always be the first match in the string.
				const i = text.indexOf(prefix);

				this.namespaces[prefix] = namespaceIri;
				this.namespaceDefinitions[prefix].push(new vscode.Range(
					new vscode.Position(startLine + n, i),
					new vscode.Position(startLine + n, i + prefix.length)
				));
			}
		}
	}

	private _registerXmlPrefixDefinition(text: string, line: number) {
		const matches = text.toLowerCase().matchAll(/(xmlns:(\w+))="([^"]+)"/g);

		for (const match of matches) {
			const prefix = match[2];
			const namespaceIri = match[3];

			if (!this.namespaceDefinitions[prefix]) {
				this.namespaceDefinitions[prefix] = [];
			}

			this.namespaces[prefix] = namespaceIri;
			this.namespaceDefinitions[prefix].push(new vscode.Range(
				new vscode.Position(line, match.index + 6),
				new vscode.Position(line, match.index + 6 + prefix.length)
			));
		}
	}

	private _registerTypedSubject(tag: SAXTag, attribute: SAXAttribute, range: vscode.Range) {
		// Get a resolved IRI from the attribute value.
		const subject = this.getIriFromXmlString(attribute.value);

		if (!subject) {
			return;
		}

		// Register the subject for code lense providers.
		this._addRangeToIndex(this.subjects, subject, range);

		// Note: rdf:Description does not assert a type.
		if (tag.uri === _RDF && tag.local === 'description') {
			return;
		}

		this._addRangeToIndex(this.typeAssertions, subject, range);

		// If the node is a type definition (RDFS, OWL class or SKOS), add it to the type definitions as well.
		switch (tag.uri) {
			case _RDF:
			case _RDFS:
			case _OWL:
			case _SKOS:
			case _SKOS_XL:
			case _SH: {
				this._addRangeToIndex(this.typeDefinitions, subject, range);
			}
		}
	}

	private _registerIriReferenceFromTagName(element: SAXTag, range: vscode.Range) {
		if (this._isXmlSpecificElement(element)) {
			return;
		}

		const iri = this.getIriFromXmlString(element.name);

		if (iri) {
			this._addRangeToIndex(this.references, iri, range);
		}
	}

	private _registerIriReferenceFromAttributeValue(attribute: SAXAttribute, range: vscode.Range) {
		const iri = this.getIriFromXmlString(attribute.value);

		if (iri) {
			this._addRangeToIndex(this.references, iri, range);
		}
	}

	private _addRangeToIndex(index: { [key: string]: Range[] }, iri: string, range: Range): void {
		if (!index[iri]) {
			index[iri] = [range];
		} else {
			index[iri].push(range);
		}
	}

	private _isXmlSpecificElement(x: SAXTag | SAXAttribute): boolean {
		const _XML = 'http://www.w3.org/XML/1998/namespace';

		const local = x.name.split(':')[1];
		const prefix = x.name.split(':')[0];
		const namespaceIri = x.uri ? x.uri : (x as any).ns[prefix];

		if (!namespaceIri) {
			return true;
		}

		switch (namespaceIri) {
			case _RDF: {
				switch (local) {
					case 'about':
					case 'rdf':
					case 'resource':
					case 'description':
					case 'datatype':
					case 'parsetype': {
						return true;
					}
				}

				return false;
			}
			case _XML: {
				return true;
			}
		}

		return false;
	}
}

interface SAXTag {
	attributes: any[];
	isSelfClosing: boolean;
	local: string;
	name: string;
	ns: any[];
	prefix: string;
	uri: string;
}

interface SAXAttribute {
	local: string;
	name: string;
	prefix: string;
	uri: string;
	value: string;
}