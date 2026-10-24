import { describe, it, expect } from 'vitest';
import { XmlParser } from '@src/languages/xml/xml-parser';

const SIMPLE_RDF = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:owl="http://www.w3.org/2002/07/owl#"
         xmlns:ex="http://example.org/">
  <owl:Class rdf:about="http://example.org/Person"/>
</rdf:RDF>`;

describe('XmlParser', () => {
		it('returns a result with namespaces populated', async () => {
			const result = new XmlParser().parse((SIMPLE_RDF));
			expect(result.namespaces).toBeDefined();
			expect(result.namespaces['rdf']).toContain('rdf-syntax-ns');
			expect(result.namespaces['owl']).toContain('owl');
			expect(result.namespaces['ex']).toBe('http://example.org/');
		});

		it('indexes namespace definitions with positions', async () => {
			const result = new XmlParser().parse((SIMPLE_RDF));
			expect(result.namespaceDefinitions['rdf']).toBeDefined();
			expect(result.namespaceDefinitions['rdf'].length).toBeGreaterThan(0);
		});

		it('identifies subject IRIs from rdf:about attributes', async () => {
			const result = new XmlParser().parse((SIMPLE_RDF));
			expect(result.subjects['http://example.org/Person']).toBeDefined();
		});

		it('indexes references for element tags using known prefixes', async () => {
			const result = new XmlParser().parse((SIMPLE_RDF));
			// owl:Class should be indexed as a reference
			expect(result.references['http://www.w3.org/2002/07/owl#Class']).toBeDefined();
		});

		it('identifies type definitions for ontology classes', async () => {
			const result = new XmlParser().parse((SIMPLE_RDF));
			expect(result.typeDefinitions['http://example.org/Person']).toBeDefined();
		});

		it('returns empty result for empty document', async () => {
			const result = new XmlParser().parse((''));
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
			const result = new XmlParser().parse((rdfWithDoctype));
			expect(result.namespaces['ex']).toBe('http://example.org/');
		});

		it('handles xml:base for relative IRI resolution', async () => {
			const rdfWithBase = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:owl="http://www.w3.org/2002/07/owl#"
         xml:base="http://example.org/">
  <owl:Class rdf:about="#Person"/>
</rdf:RDF>`;
			const result = new XmlParser().parse((rdfWithBase));
			expect(result.baseIri).toBe('http://example.org/');
		});

		describe('case-sensitive names', () => {
			const MIXED_CASE_RDF = `<?xml version="1.0"?>
<!DOCTYPE rdf:RDF [<!ENTITY exOnt "http://example.org/">]>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:dcTerms="http://purl.org/dc/terms/"
         xmlns:ex="http://example.org/">
  <ex:MyClass rdf:about="http://example.org/a"/>
  <dcTerms:Agent rdf:about="&exOnt;Person"/>
  <rdf:Description rdf:about="http://example.org/b"/>
</rdf:RDF>`;

			it('indexes an element name under its IRI as written', () => {
				const result = new XmlParser().parse(MIXED_CASE_RDF);

				expect(result.references['http://example.org/MyClass']).toHaveLength(1);
				expect(result.references['http://example.org/myclass']).toBeUndefined();
			});

			it('keeps the case of declared prefixes', () => {
				const result = new XmlParser().parse(MIXED_CASE_RDF);

				expect(result.namespaces['dcTerms']).toBe('http://purl.org/dc/terms/');
				expect(result.namespaces['dcterms']).toBeUndefined();
				expect(result.namespaceDefinitions['dcTerms']).toHaveLength(1);
			});

			it('resolves element names with a mixed-case prefix', () => {
				const result = new XmlParser().parse(MIXED_CASE_RDF);

				expect(result.references['http://purl.org/dc/terms/Agent']).toHaveLength(1);
			});

			it('resolves entity references with a mixed-case entity name', () => {
				const result = new XmlParser().parse(MIXED_CASE_RDF);

				expect(result.subjects['http://example.org/Person']).toHaveLength(1);
			});

			it('treats a subject typed by an element name as type assertion', () => {
				const result = new XmlParser().parse(MIXED_CASE_RDF);

				expect(result.typeAssertions['http://example.org/a']).toBeDefined();
				expect(result.typeAssertions['http://example.org/b']).toBeUndefined();
			});

			it('does not index the rdf:RDF and rdf:Description elements as resources', () => {
				const result = new XmlParser().parse(MIXED_CASE_RDF);

				expect(result.references['http://www.w3.org/1999/02/22-rdf-syntax-ns#RDF']).toBeUndefined();
				expect(result.references['http://www.w3.org/1999/02/22-rdf-syntax-ns#Description']).toBeUndefined();
			});
		});
	});
