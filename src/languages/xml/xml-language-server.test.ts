import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

vi.mock('vscode-languageserver/browser', async () => {
	const actual = await vi.importActual<any>('vscode-languageserver/browser');
	class TextDocuments {
		listen = vi.fn();
		onDidClose = vi.fn();
		onDidChangeContent = vi.fn();
		all = vi.fn(() => []);
	}
	return { ...actual, TextDocuments };
});

import { TextDocument } from 'vscode-languageserver-textdocument';
import { XmlLanguageServer } from './xml-language-server';

function makeConnection() {
	return {
		onInitialize: vi.fn(),
		onInitialized: vi.fn(),
		onDidChangeConfiguration: vi.fn(),
		console: { log: vi.fn() },
		sendDiagnostics: vi.fn(),
		sendNotification: vi.fn(),
		listen: vi.fn(),
		client: { register: vi.fn() },
		workspace: { onDidChangeWorkspaceFolders: vi.fn() },
	} as any;
}

function makeDoc(content: string) {
	return TextDocument.create('file:///test.rdf', 'xml', 1, content);
}

/** Expose protected parseXml for direct testing */
class TestXmlServer extends XmlLanguageServer {
	async parseXmlPublic(doc: TextDocument) {
		return (this as any).parseXml(doc);
	}
}

const SIMPLE_RDF = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:owl="http://www.w3.org/2002/07/owl#"
         xmlns:ex="http://example.org/">
  <owl:Class rdf:about="http://example.org/Person"/>
</rdf:RDF>`;

describe('XmlLanguageServer', () => {
	let server: TestXmlServer;

	beforeEach(() => {
		server = new TestXmlServer(makeConnection());
	});

	it('constructs without throwing', () => {
		expect(() => new XmlLanguageServer(makeConnection())).not.toThrow();
	});

	describe('parseXml', () => {
		it('returns a result with namespaces populated', async () => {
			const result = await server.parseXmlPublic(makeDoc(SIMPLE_RDF));
			expect(result.namespaces).toBeDefined();
			expect(result.namespaces['rdf']).toContain('rdf-syntax-ns');
			expect(result.namespaces['owl']).toContain('owl');
			expect(result.namespaces['ex']).toBe('http://example.org/');
		});

		it('indexes namespace definitions with positions', async () => {
			const result = await server.parseXmlPublic(makeDoc(SIMPLE_RDF));
			expect(result.namespaceDefinitions['rdf']).toBeDefined();
			expect(result.namespaceDefinitions['rdf'].length).toBeGreaterThan(0);
		});

		it('identifies subject IRIs from rdf:about attributes', async () => {
			const result = await server.parseXmlPublic(makeDoc(SIMPLE_RDF));
			expect(result.subjects['http://example.org/Person']).toBeDefined();
		});

		it('indexes references for element tags using known prefixes', async () => {
			const result = await server.parseXmlPublic(makeDoc(SIMPLE_RDF));
			// owl:Class should be indexed as a reference
			expect(result.references['http://www.w3.org/2002/07/owl#class']).toBeDefined();
		});

		it('identifies type definitions for ontology classes', async () => {
			const result = await server.parseXmlPublic(makeDoc(SIMPLE_RDF));
			expect(result.typeDefinitions['http://example.org/Person']).toBeDefined();
		});

		it('returns empty result for empty document', async () => {
			const result = await server.parseXmlPublic(makeDoc(''));
			expect(Object.keys(result.namespaces)).toHaveLength(0);
			expect(Object.keys(result.subjects)).toHaveLength(0);
		});

		it('handles rdf:about with ENTITY reference from DOCTYPE', async () => {
			const rdfWithDoctype = `<?xml version="1.0"?>
<!DOCTYPE rdf:RDF [<!ENTITY ex "http://example.org/">]>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:owl="http://www.w3.org/2002/07/owl#">
  <owl:Class rdf:about="&ex;Person"/>
</rdf:RDF>`;
			const result = await server.parseXmlPublic(makeDoc(rdfWithDoctype));
			expect(result.namespaces['ex']).toBe('http://example.org/');
		});

		it('handles xml:base for relative IRI resolution', async () => {
			const rdfWithBase = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:owl="http://www.w3.org/2002/07/owl#"
         xml:base="http://example.org/">
  <owl:Class rdf:about="#Person"/>
</rdf:RDF>`;
			const result = await server.parseXmlPublic(makeDoc(rdfWithBase));
			expect(result.baseIri).toBe('http://example.org/');
		});
	});

	describe('validateTextDocument', () => {
		it('sends diagnostics to connection', async () => {
			const conn = makeConnection();
			const srv = new XmlLanguageServer(conn);
			await (srv as any).validateTextDocument(makeDoc(SIMPLE_RDF));
			expect(conn.sendDiagnostics).toHaveBeenCalled();
		});

		it('sends updateContext notification on successful parse', async () => {
			const conn = makeConnection();
			const srv = new XmlLanguageServer(conn);
			await (srv as any).validateTextDocument(makeDoc(SIMPLE_RDF));
			expect(conn.sendNotification).toHaveBeenCalledWith(
				'mentor.message.updateContext',
				expect.objectContaining({ languageId: 'xml' })
			);
		});

		it('returns early without sending diagnostics when connection is missing', async () => {
			const conn = makeConnection();
			const srv = new XmlLanguageServer(conn);
			(srv as any).connection = undefined;
			await expect((srv as any).validateTextDocument(makeDoc(SIMPLE_RDF))).resolves.toBeUndefined();
		});

		it('sends error diagnostic when parse fails', async () => {
			const conn = makeConnection();
			const srv = new XmlLanguageServer(conn);
			// Force parseXml to throw
			vi.spyOn(srv as any, 'parseXml').mockRejectedValue(new Error('parse error'));
			await (srv as any).validateTextDocument(makeDoc('<invalid>'));
			expect(conn.sendDiagnostics).toHaveBeenCalledWith(
				expect.objectContaining({ diagnostics: expect.arrayContaining([
					expect.objectContaining({ message: expect.stringContaining('parse error') })
				])})
			);
		});
	});

	describe('_parseElements — non-self-closing and text literals', () => {
		it('tracks text literal ranges for non-self-closing elements with same-line text content', async () => {
			const rdf = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:owl="http://www.w3.org/2002/07/owl#"
         xmlns:ex="http://example.org/">
  <owl:Class rdf:about="http://example.org/Person">some label text</owl:Class>
</rdf:RDF>`;
			const result = await server.parseXmlPublic(makeDoc(rdf));
			expect(result.textLiteralRanges.length).toBeGreaterThan(0);
		});

		it('tracks text literal ranges for multi-line element text content', async () => {
			const rdf = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:owl="http://www.w3.org/2002/07/owl#"
         xmlns:ex="http://example.org/">
  <owl:Class rdf:about="http://example.org/Person">
    some label text on a new line
  </owl:Class>
</rdf:RDF>`;
			const result = await server.parseXmlPublic(makeDoc(rdf));
			expect(result.textLiteralRanges.length).toBeGreaterThan(0);
		});
	});

	describe('_getIriFromXmlString — prefixed name resolution', () => {
		it('resolves rdf:about value that uses a prefixed name (ex:Person)', async () => {
			const rdf = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:owl="http://www.w3.org/2002/07/owl#"
         xmlns:ex="http://example.org/">
  <owl:Class rdf:about="ex:Person"/>
</rdf:RDF>`;
			const result = await server.parseXmlPublic(makeDoc(rdf));
			// ex:Person should resolve to http://example.org/Person
			expect(result.subjects['http://example.org/Person']).toBeDefined();
		});
	});

	describe('_addRangeToIndex — duplicate IRI', () => {
		it('adds a second range when the same IRI is referenced twice', async () => {
			const rdf = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:owl="http://www.w3.org/2002/07/owl#"
         xmlns:ex="http://example.org/">
  <owl:Class rdf:about="http://example.org/PersonA"/>
  <owl:Class rdf:about="http://example.org/PersonB"/>
</rdf:RDF>`;
			const result = await server.parseXmlPublic(makeDoc(rdf));
			// owl:class iri referenced twice → _addRangeToIndex else branch
			const owlClassIri = 'http://www.w3.org/2002/07/owl#class';
			expect(result.references[owlClassIri]).toBeDefined();
			expect(result.references[owlClassIri].length).toBeGreaterThanOrEqual(2);
		});
	});

	describe('_isXmlSpecificTagName — skipped tag names', () => {
		it('does not index elements whose namespace IRI is the XML namespace', async () => {
			const rdf = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:owl="http://www.w3.org/2002/07/owl#"
         xmlns:xmltag="http://www.w3.org/XML/1998/namespace"
         xmlns:ex="http://example.org/">
  <xmltag:lang rdf:about="http://example.org/LangA"/>
</rdf:RDF>`;
			const result = await server.parseXmlPublic(makeDoc(rdf));
			// xmltag:lang should not appear in references because it is XML-specific
			const xmlLangIri = 'http://www.w3.org/XML/1998/namespacelang';
			expect(result.references[xmlLangIri]).toBeUndefined();
		});

		it('does not index rdf-specific local names (e.g. rdf:Description)', async () => {
			const rdf = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:ex="http://example.org/">
  <rdf:Description rdf:about="http://example.org/Thing"/>
</rdf:RDF>`;
			const result = await server.parseXmlPublic(makeDoc(rdf));
			// rdf:description is in the special-case list → not added to references
			const rdfDescriptionIri = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#description';
			expect(result.references[rdfDescriptionIri]).toBeUndefined();
		});
	});

	describe('_isDefinitionNamespace', () => {
		it('returns true for SKOS namespace elements used as type tags', async () => {
			const rdf = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:skos="http://www.w3.org/2004/02/skos/core#"
         xmlns:ex="http://example.org/">
  <skos:Concept rdf:about="http://example.org/MyConcept"/>
</rdf:RDF>`;
			const result = await server.parseXmlPublic(makeDoc(rdf));
			// skos:Concept is a definition namespace → typeDefinitions populated
			expect(result.typeDefinitions['http://example.org/MyConcept']).toBeDefined();
		});

		it('returns false for non-ontology namespaces used as type tags', async () => {
			const rdf = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:ex="http://example.org/"
         xmlns:app="http://myapp.example.com/types/">
  <app:Widget rdf:about="http://example.org/MyWidget"/>
</rdf:RDF>`;
			const result = await server.parseXmlPublic(makeDoc(rdf));
			// app namespace is NOT a known definition namespace → not in typeDefinitions
			expect(result.typeDefinitions['http://example.org/MyWidget']).toBeUndefined();
		});
	});
});
