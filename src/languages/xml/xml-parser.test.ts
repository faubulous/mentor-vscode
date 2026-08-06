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
			expect(result.references['http://www.w3.org/2002/07/owl#class']).toBeDefined();
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
	});
