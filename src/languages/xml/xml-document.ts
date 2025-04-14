import * as vscode from 'vscode';
import { Range } from 'vscode-languageserver-types';
import { SAXParser } from 'sax-ts';
import { _OWL, _RDF, _RDFS, _SH, _SKOS, _SKOS_XL, RdfSyntax } from '@faubulous/mentor-rdf';
import { mentor } from '@/mentor';
import { DocumentContext, TokenTypes } from '@/document-context';
import { DefinitionProvider } from '@/languages/definition-provider';
import { XmlDefinitionProvider } from '@/languages/xml/providers/xml-definition-provider';
import { NamespaceMap, getIriFromPrefixedName } from '@/utilities';

// NOTES
// - Positions are 0-based in the XML parser, but 1-based in VSCode.
// - Position handling is seperate for attributes and tags:
// 	- Attribute positions point at the *end* of the parsed attribute.
// 	- Open tag positions point at the *start* of the tag.
// - It's not always necessary to retrieve the document when we have the value from the parser:
//  - getIriFromAttributeName, getIriFromQuotedIri, getIriFromQuotedLocalName, and getIriFromQuotedPrefixedName retrieve the document where we could provide the line instead.
//  - Refactor into more specific sub-functions.
// - Remove getTokenTypes and getPrefixDefinition
//  - Move into Definition Service for the XML language.

/**
 * A document context for RDF/XML documents.
 */
export class XmlDocument extends DocumentContext {
	readonly syntax: RdfSyntax;

	private _inferenceExecuted = false;

	private _definitionProvider: DefinitionProvider = new XmlDefinitionProvider();

	constructor(uri: vscode.Uri) {
		super(uri);

		this.syntax = RdfSyntax.RdfXml;
	}

	get isLoaded(): boolean {
		return this.graphs.length > 0;
	}

	public override getDefinitionProvider(): DefinitionProvider {
		return this._definitionProvider;
	}

	public override getPrefixDefinition(prefix: string, uri: string, upperCase: boolean): string {
		return `xmlns:${prefix}="${uri}"`;
	}

	public override getTokenTypes(): TokenTypes {
		return {
			PREFIX: '',
			BASE: '',
			IRIREF: '',
			PNAME_NS: '',
		}
	}

	public override async infer(): Promise<void> {
		const reasoner = mentor.store.reasoner;

		if (reasoner && !this._inferenceExecuted) {
			this._inferenceExecuted = true;

			mentor.store.executeInference(this.uri.toString());
		}
	}

	public override async parse(uri: vscode.Uri, data: string): Promise<void> {
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

		return new Promise((resolve, reject) => {
			const parser = new SAXParser(false, {
				trim: false,
				normalize: false,
				lowercase: true,
				xmlns: true,
				position: true,
			}) as SAXParser & { line: number; column: number };

			let currentTag: SAXTag | undefined;

			parser.onopentagstart = (tag: SAXTag) => {
				currentTag = tag;

				// Note: The tag name is lowercased by the parser so we need to lower case the line too.
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

			parser.onattribute = (attribute: SAXAttribute) => {
				if (this._registerPrefixDefinition(attribute)) {
					return;
				}

				if (attribute.uri === _RDF) {
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

					if (currentTag && attribute.local === 'about') {
						this._registerTypeReference(currentTag, range);
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

	private _registerPrefixDefinition(attribute: SAXAttribute) {
		if (attribute.prefix === 'xmlns') {
			this.namespaces[attribute.local] = attribute.value;

			return true;
		} else if (attribute.name === 'xml:base') {
			this.baseIri = attribute.value;

			return true;
		} else {
			return false;
		}
	}

	private _registerTypeReference(tag: SAXTag, range: vscode.Range) {
		// Note: rdf:Description does not assert a type.
		if (tag.uri === _RDF && tag.local === 'description') {
			return;
		}

		// Get a resolved IRI from the attribute value.
		const subject = this._getIriFromXmlString(tag.name);

		if (!subject) {
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

		const iri = this._getIriFromXmlString(element.name);

		if (iri) {
			this._addRangeToIndex(this.references, iri, range);
		}
	}

	private _registerIriReferenceFromAttributeValue(attribute: SAXAttribute, range: vscode.Range) {
		const iri = this._getIriFromXmlString(attribute.value);

		if (iri) {
			this._addRangeToIndex(this.references, iri, range);
		}
	}

	private _getIriFromXmlString(value: string): string | undefined {
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

	/**
	 * Get the full IRI of an attribute name or of a quoted string at the given position in the XML document.
	 * @param context A document context.
	 * @param position A position in the document.
	 * @returns A full IRI if found, `undefined` otherwise.
	 */
	getIriAtPosition(document: vscode.TextDocument, position: { line: number, character: number }): string | undefined {
		const line = document.lineAt(position.line).text;

		if (!line) {
			return;
		}

		let result = this.getIriFromAttributeName(line, position, this.namespaces);

		if (!result) {
			result = this.getIriFromQuotedIri(line, position);
		}

		if (!result) {
			result = this.getIriFromQuotedPrefixedName(line, position, this.namespaces);
		}

		if (!result && this.baseIri) {
			result = this.getIriFromQuotedLocalName(line, position, this.baseIri);
		}

		return result;
	}

	/**
	 * Extracts the full attribute (e.g., xml:lang) at the given character position in a line of text.
	 * @param line The line of text.
	 * @param character The character position.
	 * @returns The full attribute or null if not found.
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
	 * @returns A full IRI if found, `undefined` otherwise.
	 */
	protected getIriFromQuotedLocalName(line: string, position: { line: number, character: number }, baseIri: string): string | undefined {
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