import * as vscode from 'vscode';
import { SAXParser } from 'sax-ts';
import { _OWL, _RDF, _RDFS, _SH, _SKOS, _SKOS_XL, RdfSyntax } from '@faubulous/mentor-rdf';
import { mentor } from '@/mentor';
import { DocumentContext, TokenTypes } from '@/document-context';
import { DefinitionProvider } from '@/languages/definition-provider';
import { XmlDefinitionProvider } from '@/languages/xml/providers/xml-definition-provider';

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

			// Parse the Namespace declarations from the RDF/XML document.
			this.parseXmlnsAttributes(data);

			this.baseIri = this.getXmlBaseIri(data);

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

	public override getTokenTypes(): TokenTypes {
		return {
			PREFIX: '',
			BASE: '',
			IRIREF: '',
			PNAME_NS: '',
		}
	}

	protected getXmlBaseIri(data: string): string | undefined {
		const regex = /xml:base="([^"]+)"/i;
		const match = regex.exec(data);

		if (match) {
			return match[1];
		}
	}

	public override getPrefixDefinition(prefix: string, uri: string, upperCase: boolean): string {
		return `xmlns:${prefix}="${uri}"`;
	}

	/**
	 * Indicates whether the given data is RDF/XML document.
	 * @param data The RDF/XML document as a string.
	 * @returns `true` if the given data is RDF/XML, `false` otherwise.
	 */
	protected isRdfXml(data: string): boolean {
		const regex = /<rdf:RDF\s+xmlns:([a-zA-Z_][\w.-]*)="([^"]+)"\s*>/i;

		return regex.test(data);
	}

	/**
	 * Parses xmlns attributes from the given RDF/XML document string.
	 * @param data The RDF/XML document as a string.
	 * @returns A map of prefix-to-namespace URIs.
	 */
	protected parseXmlnsAttributes(data: string) {
		// Regular expression to match xmlns attributes (e.g., xmlns:prefix="namespace")
		const regex = /xmlns:([a-zA-Z_][\w.-]*)="([^"]+)"/g;

		let match: RegExpExecArray | null;

		while ((match = regex.exec(data)) !== null) {
			const prefix = match[1];
			const namespaceIri = match[2];

			this.namespaces[prefix] = namespaceIri;
		}
	}

	protected async parseXml(data: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const parser = new SAXParser(false, {
				trim: false,
				normalize: false,
				lowercase: true,
				xmlns: true,
				position: true,
			}) as SAXParser & { line: number; column: number };

			let currentTag: SAXNode | undefined;

			parser.onopentagstart = (node: SAXNode) => {
				currentTag = node;
			};

			parser.onattribute = (attribute: SAXAttribute) => {
				if(this._handlePrefixDefinition(attribute)) {
					return;
				}
			};

			parser.onerror = (error: any) => reject(error);
			parser.onend = () => resolve();

			parser.write(data).close();
		});
	}

	/**
	 * Get a range that starts at the given position and extents to the given length.
	 * @param position The SAX parser position object.
	 * @param length Length of the text that starts at the given position.
	 * @returns A `vscode.Range` object that represents the range of the text.
	 */
	private _getRange(position: { line: number, column: number }, length: number) {
		return new vscode.Range(
			new vscode.Position(position.line + 1, position.column + 1),
			new vscode.Position(position.line + 1, position.column + 1 + length)
		);
	}

	private _handlePrefixDefinition(attribute: SAXAttribute) {
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

	private _handleTypeAssertion(node: SAXNode, position: { line: number, column: number }) {
		const subject = this._getAttribute(node, _RDF + 'about');

		if (!subject) return;

		const range = new vscode.Range(
			new vscode.Position(position.line + 1, position.column + 1),
			new vscode.Position(position.line + 1, position.column + 1 + subject.value.length)
		);

		// Check for local names that must be resolved against the base IRI.
		this.typeAssertions[subject.uri + subject.local] = [range];
	}

	private _handleTypeDefinition(node: SAXNode, position: { line: number, column: number }) {
		const subject = this._getAttribute(node, _RDF + 'about');

		if (!subject) return;

		switch (node.uri) {
			case _RDF:
			case _RDFS:
			case _OWL:
			case _SKOS:
			case _SKOS_XL:
			case _SH: {
				const range = new vscode.Range(
					new vscode.Position(position.line + 1, position.column + 1),
					new vscode.Position(position.line + 1, position.column + 1 + subject.value.length)
				);

				// Check for local names that must be resolved against the base IRI.
				this.typeDefinitions[subject.uri + subject.local] = [range];
			}
		}
	}

	private _handleIriReference(uri: string) { }

	private _getAttribute(node: SAXNode, attributeIri: string): SAXAttribute | undefined {
		for (const attribute of Object.values(node.attributes)) {
			if (attribute.uri + attribute.local === attributeIri) {
				return attribute;
			}
		}
	}

	private _isReservedTag(node: SAXNode) {
		const iri = node.uri + node.local;

		switch (iri) {
			case _RDF + 'rdf':
			case _RDF + 'description':
			case _RDF + 'resource': {
				return true;
			}
			default: {
				return false;
			}
		}
	}
}

interface SAXNode {
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