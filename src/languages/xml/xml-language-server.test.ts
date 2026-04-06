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
});
