import {
	Connection,
	Diagnostic,
	DiagnosticSeverity,
	Range,
} from 'vscode-languageserver/browser';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { LanguageServerBase } from '@src/languages/language-server';
import { XmlParseResult } from './xml-types';

// Inline namespace constants to avoid importing @faubulous/mentor-rdf which has CommonJS dependencies
const _RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const _RDFS = 'http://www.w3.org/2000/01/rdf-schema#';
const _OWL = 'http://www.w3.org/2002/07/owl#';
const _SH = 'http://www.w3.org/ns/shacl#';
const _SKOS = 'http://www.w3.org/2004/02/skos/core#';
const _SKOS_XL = 'http://www.w3.org/2008/05/skos-xl#';

// XML NCName character class per the XML Namespaces 1.0 spec:
// letters, digits, hyphens, periods, underscores (and Unicode ranges, approximated by \w).
const _NC_NAME = '[\\w\\-.]';

export class XmlLanguageServer extends LanguageServerBase {
	constructor(connection: Connection) {
		super(connection, 'xml', 'RDF/XML');
	}

	override async validateTextDocument(document: TextDocument): Promise<void> {
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
		const doctype = data.match(/<!DOCTYPE[^>]*\[([^\]]*)\]>/s);

		if (!doctype) {
			return;
		}

		const lines = data.substring(0, data.indexOf(doctype[0]) + doctype[0].length).split('\n');
		const doctypeContent = doctype[1];
		const doctypeStartLine = lines.length - doctypeContent.split('\n').length;

		// Find ENTITY definitions
		const entityRegex = new RegExp(`<!ENTITY\\s+(${_NC_NAME}+)\\s+"([^"]+)">`, 'g');
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
			const base = line.match(/xml:base\s*=\s*["']([^"']+)["']/i);

			if (base) {
				result.baseIri = base[1];
			}

			// Find xmlns definitions
			const xmlnsRegex = new RegExp(`xmlns:(${_NC_NAME}+)\\s*=\\s*["']([^"']+)["']`, 'gi');
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
			const tagRegex = new RegExp(`<(${_NC_NAME}+):(${_NC_NAME}+)`, 'g');
			let tag;

			while ((tag = tagRegex.exec(line)) !== null) {
				const prefix = tag[1].toLowerCase();
				const namespaceIri = result.namespaces[prefix];

				const localName = tag[2].toLowerCase();
				const fullName = `${prefix}:${localName}`;
				const column = tag.index + 1; // After '<'

				if (namespaceIri && !this._isXmlSpecificTagName(prefix, localName, namespaceIri)) {
					const iri = namespaceIri + localName;

					if (namespaceIri === 'https://spec.industrialontologies.org/ontology/construct/') {
						console.log(`Found construct reference (${iri}) at line ${lineNumber}`);
					}

					if (iri === "https://spec.industrialontologies.org/ontology/construct/MeasurementCapability") {
						console.log("Found MeasurementCapability reference at line " + lineNumber);
					}

					this._addRangeToIndex(result.references, iri, Range.create(
						lineNumber, column,
						lineNumber, column + fullName.length
					));
				}

				// Track element end for text literal detection
				const tagEnd = line.indexOf('>', tag.index);

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
				const closeTagMatch = line.match(new RegExp(`<\\/(${_NC_NAME}+:${_NC_NAME}+)>`));

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

			if (iri) {
				this._addRangeToIndex(result.references, iri, range);

				if (attrName === 'about') {
					this._addRangeToIndex(result.subjects, iri, range);

					// Check if this is a typed subject (not rdf:Description)
					const tag = line.match(new RegExp(`<(${_NC_NAME}+):(${_NC_NAME}+)`));

					if (tag) {
						const tagPrefix = tag[1].toLowerCase();
						const tagLocal = tag[2].toLowerCase();
						const tagNamespace = result.namespaces[tagPrefix];

						// If the tag is not rdf:Description, we treat the subject as 
						// having the type of the tag name.
						if (tagNamespace !== _RDF && tagLocal !== 'description') {
							this._addRangeToIndex(result.typeAssertions, iri, range);

							if (this._isDefinitionNamespace(tagNamespace)) {
								this._addRangeToIndex(result.typeDefinitions, iri, range);
							}
						}
					}
				}
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
