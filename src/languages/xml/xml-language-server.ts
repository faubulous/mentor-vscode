import {
	Connection,
	Diagnostic,
	DiagnosticSeverity,
	DidChangeConfigurationNotification,
	DidChangeConfigurationParams,
	InitializeParams,
	InitializeResult,
	Range,
	TextDocumentChangeEvent,
	TextDocuments,
	TextDocumentSyncKind
} from 'vscode-languageserver/browser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { XmlParseResult } from './xml-types';

// Inline namespace constants to avoid importing @faubulous/mentor-rdf which has CommonJS dependencies
const _RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const _RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const _OWL = 'http://www.w3.org/2002/07/owl#';
const _SH = 'http://www.w3.org/ns/shacl#';
const _SKOS = 'http://www.w3.org/2004/02/skos/core#';
const _SKOS_XL = 'http://www.w3.org/2008/05/skos-xl#';

/**
 * Parser settings for RDF/XML documents.
 */
interface ParserSettings {
	maxNumberOfProblems: number;
}

const defaultSettings: ParserSettings = {
	maxNumberOfProblems: 1000
};

export class XmlLanguageServer {
	readonly languageName = 'RDF/XML';
	readonly languageId = 'xml';

	readonly connection: Connection;
	readonly documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);
	readonly documentSettings: Map<string, Thenable<ParserSettings>> = new Map();

	hasConfigurationCapability = false;
	hasWorkspaceFolderCapability = false;
	hasDiagnosticRelatedInformationCapability = false;

	globalSettings: ParserSettings = defaultSettings;

	constructor(connection: Connection) {
		this.connection = connection;
		this.connection.onInitialize(this.onInitializeConnection.bind(this));
		this.connection.onInitialized(this.onConnectionInitialized.bind(this));
		this.connection.onDidChangeConfiguration(this.onDidChangeConfiguration.bind(this));

		this.documents.onDidClose(this.onDidClose.bind(this));
		this.documents.onDidChangeContent(this.onDidChangeContent.bind(this));
	}

	protected log(message: string) {
		const msg = `[Server] ${message}`;

		if (this.connection.console) {
			this.connection.console.log(msg);
		} else {
			console.log(msg);
		}
	}

	start() {
		this.documents.listen(this.connection);
		this.connection.listen();
		this.log(`Started ${this.languageName} Language Server.`);
	}

	protected onInitializeConnection(params: InitializeParams) {
		const capabilities = params.capabilities;

		this.hasConfigurationCapability = !!(
			capabilities.workspace && !!capabilities.workspace.configuration
		);

		this.hasWorkspaceFolderCapability = !!(
			capabilities.workspace && !!capabilities.workspace.workspaceFolders
		);

		this.hasDiagnosticRelatedInformationCapability = !!(
			capabilities.textDocument &&
			capabilities.textDocument.publishDiagnostics &&
			capabilities.textDocument.publishDiagnostics.relatedInformation
		);

		const result: InitializeResult = {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Incremental
			}
		};

		if (this.hasWorkspaceFolderCapability) {
			result.capabilities.workspace = {
				workspaceFolders: {
					supported: true
				}
			};
		}

		return result;
	}

	protected onConnectionInitialized() {
		if (this.hasConfigurationCapability) {
			this.connection.client.register(DidChangeConfigurationNotification.type, undefined);
		}

		if (this.hasWorkspaceFolderCapability) {
			this.connection.workspace.onDidChangeWorkspaceFolders(_event => {
				this.log('Workspace folder change event received.');
			});
		}
	}

	protected onDidChangeConfiguration(change: DidChangeConfigurationParams) {
		this.log(`Configuration changed.`);

		if (this.hasConfigurationCapability) {
			this.documentSettings.clear();
		} else {
			this.globalSettings = <ParserSettings>((change.settings.languageServerExample || defaultSettings));
		}

		this.documents.all().forEach(doc => this.validateTextDocument(doc));
	}

	protected onDidClose(e: TextDocumentChangeEvent<TextDocument>) {
		this.documentSettings.delete(e.document.uri);
	}

	protected onDidChangeContent(change: TextDocumentChangeEvent<TextDocument>) {
		this.validateTextDocument(change.document);
	}

	async validateTextDocument(document: TextDocument): Promise<void> {
		if (!this?.connection) {
			return;
		}

		this.log(`Validating document: ${document.uri}`);

		const content = document.getText();
		const diagnostics: Diagnostic[] = [];

		if (content.length) {
			try {
				const result = await this.parseXml(document);

				// Send the parsed data to the client
				this.connection.sendNotification('mentor.message.updateContext', {
					uri: document.uri,
					languageId: this.languageId,
					parsedData: result
				});
			} catch (e) {
				diagnostics.push({
					severity: DiagnosticSeverity.Error,
					message: e ? e.toString() : "An error occurred while parsing the document.",
					range: Range.create(0, 0, 0, 0)
				});
			}
		}

		this.connection.sendDiagnostics({ uri: document.uri, diagnostics });
	}

	protected async parseXml(document: TextDocument): Promise<XmlParseResult> {
		const data = document.getText();
		const lines = data.split('\n');
		const result: XmlParseResult = {
			namespaces: {},
			namespaceDefinitions: {},
			subjects: {},
			references: {},
			typeAssertions: {},
			typeDefinitions: {},
			textLiteralRanges: []
		};

		// Parse DOCTYPE for entity definitions
		this._parseDoctypeEntities(data, result);

		// Parse namespace definitions and xml:base
		this._parseNamespaces(lines, result);

		// Parse elements and attributes
		this._parseElements(lines, result);

		return result;
	}

	private _parseDoctypeEntities(data: string, result: XmlParseResult): void {
		// Match DOCTYPE section
		const doctypeMatch = data.match(/<!DOCTYPE[^>]*\[([^\]]*)\]>/s);
		if (!doctypeMatch) return;

		const doctypeContent = doctypeMatch[1];
		const lines = data.substring(0, data.indexOf(doctypeMatch[0]) + doctypeMatch[0].length).split('\n');
		const doctypeStartLine = lines.length - doctypeContent.split('\n').length;

		// Find ENTITY definitions
		const entityRegex = /<!ENTITY\s+(\w+)\s+"([^"]+)">/g;
		let match;

		while ((match = entityRegex.exec(doctypeContent)) !== null) {
			const prefix = match[1];
			const namespaceIri = match[2];
			
			// Find line number for this entity
			const beforeMatch = doctypeContent.substring(0, match.index);
			const lineOffset = beforeMatch.split('\n').length - 1;
			const lineNumber = doctypeStartLine + lineOffset;
			
			// Find column position
			const lineStart = beforeMatch.lastIndexOf('\n') + 1;
			const lineText = doctypeContent.substring(lineStart);
			const column = lineText.indexOf(prefix);

			result.namespaces[prefix] = namespaceIri;
			
			if (!result.namespaceDefinitions[prefix]) {
				result.namespaceDefinitions[prefix] = [];
			}
			result.namespaceDefinitions[prefix].push(Range.create(
				lineNumber, column,
				lineNumber, column + prefix.length
			));
		}
	}

	private _parseNamespaces(lines: string[], result: XmlParseResult): void {
		for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
			const line = lines[lineNumber];

			// Check for xml:base attribute
			const baseMatch = line.match(/xml:base\s*=\s*["']([^"']+)["']/i);
			if (baseMatch) {
				result.baseIri = baseMatch[1];
			}

			// Find xmlns definitions
			const xmlnsRegex = /xmlns:(\w+)\s*=\s*["']([^"']+)["']/gi;
			let nsMatch;

			while ((nsMatch = xmlnsRegex.exec(line)) !== null) {
				const prefix = nsMatch[1].toLowerCase();
				const namespaceIri = nsMatch[2];
				const column = nsMatch.index + 6; // "xmlns:" length

				result.namespaces[prefix] = namespaceIri;
				
				if (!result.namespaceDefinitions[prefix]) {
					result.namespaceDefinitions[prefix] = [];
				}
				result.namespaceDefinitions[prefix].push(Range.create(
					lineNumber, column,
					lineNumber, column + prefix.length
				));
			}
		}
	}

	private _parseElements(lines: string[], result: XmlParseResult): void {
		// Track element positions for text literal detection
		let inElement = false;
		let elementEndLine = -1;
		let elementEndColumn = -1;

		for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
			const line = lines[lineNumber];

			// Find opening tags with prefixes (e.g., <owl:Class, <rdf:Property)
			const tagRegex = /<([\w-]+):([\w-]+)/g;
			let tagMatch;

			while ((tagMatch = tagRegex.exec(line)) !== null) {
				const prefix = tagMatch[1].toLowerCase();
				const localName = tagMatch[2].toLowerCase();
				const fullName = `${prefix}:${localName}`;
				const column = tagMatch.index + 1; // After '<'

				const namespaceIri = result.namespaces[prefix];
				if (namespaceIri && !this._isXmlSpecificTagName(prefix, localName, namespaceIri)) {
					const iri = namespaceIri + localName;
					this._addRangeToIndex(result.references, iri, Range.create(
						lineNumber, column,
						lineNumber, column + fullName.length
					));
				}

				// Track element end for text literal detection
				const tagEnd = line.indexOf('>', tagMatch.index);
				if (tagEnd !== -1) {
					const isSelfClosing = line[tagEnd - 1] === '/';
					if (!isSelfClosing) {
						inElement = true;
						elementEndLine = lineNumber;
						elementEndColumn = tagEnd + 1;
					}
				}
			}

			// Find rdf:about, rdf:resource, rdf:datatype attributes
			this._parseRdfAttributes(line, lineNumber, result);

			// Track text content for literal ranges
			if (inElement) {
				const closeTagMatch = line.match(/<\/([\w-]+:[\w-]+)>/);
				if (closeTagMatch) {
					const textEndColumn = line.indexOf(closeTagMatch[0]);
					if (textEndColumn > elementEndColumn || lineNumber > elementEndLine) {
						// Check if there's actual text content
						let hasText = false;
						if (lineNumber === elementEndLine) {
							hasText = line.substring(elementEndColumn, textEndColumn).trim().length > 0;
						} else {
							hasText = true; // Multi-line content, assume text exists
						}

						if (hasText) {
							result.textLiteralRanges.push(Range.create(
								elementEndLine, elementEndColumn,
								lineNumber, textEndColumn
							));
						}
					}
					inElement = false;
				}
			}
		}
	}

	private _parseRdfAttributes(line: string, lineNumber: number, result: XmlParseResult): void {
		// Match rdf:about, rdf:resource, rdf:datatype attributes
		const attrRegex = /rdf:(about|resource|datatype)\s*=\s*["']([^"']+)["']/gi;
		let attrMatch;

		while ((attrMatch = attrRegex.exec(line)) !== null) {
			const attrName = attrMatch[1].toLowerCase();
			const attrValue = attrMatch[2];
			
			// Find the column where the value starts (inside quotes)
			const valueStart = line.indexOf(attrValue, attrMatch.index);
			const range = Range.create(
				lineNumber, valueStart,
				lineNumber, valueStart + attrValue.length
			);

			const iri = this._getIriFromXmlString(attrValue, result.namespaces, result.baseIri);

			if (attrName === 'about' && iri) {
				this._addRangeToIndex(result.subjects, iri, range);
				
				// Check if this is a typed subject (not rdf:Description)
				const tagMatch = line.match(/<([\w-]+):([\w-]+)/);
				if (tagMatch) {
					const tagPrefix = tagMatch[1].toLowerCase();
					const tagLocal = tagMatch[2].toLowerCase();
					const tagNamespace = result.namespaces[tagPrefix];

					if (!(tagNamespace === _RDF && tagLocal === 'description')) {
						this._addRangeToIndex(result.typeAssertions, iri, range);

						if (this._isDefinitionNamespace(tagNamespace)) {
							this._addRangeToIndex(result.typeDefinitions, iri, range);
						}
					}
				}
			}

			if (iri) {
				this._addRangeToIndex(result.references, iri, range);
			}
		}
	}

	private _getIriFromXmlString(value: string, namespaces: { [key: string]: string }, baseIri?: string): string | undefined {
		if (value.startsWith('&')) {
			const prefix = value.trim().split(';')[0].substring(1);
			const namespaceIri = namespaces[prefix];

			if (namespaceIri) {
				const localName = value.split(';')[1];
				return namespaceIri + localName;
			}
		}
		else if (value.startsWith('#') || !value.includes(':')) {
			return baseIri ? baseIri + value : value;
		} else if (value.length > 0) {
			const schemeOrPrefix = value.split(':')[0];

			if (namespaces[schemeOrPrefix]) {
				return namespaces[schemeOrPrefix] + value.split(':')[1];
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

	private _isXmlSpecificTagName(prefix: string, localName: string, namespaceIri: string): boolean {
		const _XML = 'http://www.w3.org/XML/1998/namespace';

		if (namespaceIri === _XML) {
			return true;
		}

		if (namespaceIri === _RDF) {
			switch (localName) {
				case 'about':
				case 'rdf':
				case 'resource':
				case 'description':
				case 'datatype':
				case 'parsetype':
					return true;
			}
		}

		return false;
	}

	private _isDefinitionNamespace(namespaceIri: string | undefined): boolean {
		if (!namespaceIri) return false;

		switch (namespaceIri) {
			case _RDF:
			case _RDFS:
			case _OWL:
			case _SKOS:
			case _SKOS_XL:
			case _SH:
				return true;
		}

		return false;
	}
}
