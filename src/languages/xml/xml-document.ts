import * as vscode from 'vscode';
import { Range } from 'vscode-languageserver-types';
import { SAXParser } from 'sax-ts';
import { _OWL, _RDF, _RDFS, _SH, _SKOS, _SKOS_XL, RdfSyntax } from '@faubulous/mentor-rdf';
import { mentor } from '@/mentor';
import { DocumentContext, TokenTypes } from '@/document-context';
import { DefinitionProvider } from '@/languages/definition-provider';
import { XmlDefinitionProvider } from '@/languages/xml/providers/xml-definition-provider';

// TODO: Move getTokenTypes and getPrefixDefintion int the Definition Service for the XML language.

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
						this._registerTypedSubject(currentTag, range);
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

	private _registerTypedSubject(tag: SAXTag, range: vscode.Range) {
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