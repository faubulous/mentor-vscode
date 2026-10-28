import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { OWL, RDFS, SKOS, _OWL, _RDFS, _SH, _SKOS, _XSD } from '@faubulous/mentor-rdf';
import { ResolvingDocumentContextOptions, createResolvingDocumentContext, readTurtleQuadContexts } from '@src/utilities/mocks/factories';
import { ResourceIndex } from './resource-index';
import { ResourceIndexBuilder } from './resource-index-builder';

const EX = 'http://example.org/';
const NAMESPACES = { ex: EX, rdfs: _RDFS, owl: _OWL, sh: _SH, skos: _SKOS, xsd: _XSD };
const PREAMBLE = Object.entries(NAMESPACES).map(([prefix, iri]) => `@prefix ${prefix}: <${iri}> .\n`).join('');

/**
 * Build the index of a Turtle body written after the prefix declarations.
 */
function indexOf(body: string, options: ResolvingDocumentContextOptions = {}): ResourceIndex {
	const context = createResolvingDocumentContext({ namespaces: NAMESPACES, ...options });

	return new ResourceIndexBuilder(readTurtleQuadContexts(PREAMBLE + body), context).build();
}

describe('ResourceIndexBuilder', () => {
	it('lists subjects in document order', () => {
		const index = indexOf('ex:Zebra a ex:Animal .\nex:Ant a ex:Animal .\nex:Moose a ex:Animal .\n');

		expect(index.summaries.map(summary => summary.term)).toEqual([
			{ kind: 'iri', iri: `${EX}Zebra` },
			{ kind: 'iri', iri: `${EX}Ant` },
			{ kind: 'iri', iri: `${EX}Moose` }
		]);
	});

	it('groups the statements of a subject written as separate blocks', () => {
		const index = indexOf('ex:Thing a ex:Class .\nex:Other a ex:Class .\nex:Thing ex:label "second block" .\n');

		expect(index.entries.get(`i:${EX}Thing`)?.quads).toHaveLength(2);
		expect(index.summaries).toHaveLength(2);
	});

	it('keeps duplicate statements distinguishable', () => {
		const index = indexOf('ex:Thing ex:note "same" , "same" .\n');

		expect(index.entries.get(`i:${EX}Thing`)?.quads).toHaveLength(2);
	});

	it('treats an anonymous blank node used once as an object as nested', () => {
		const index = indexOf('ex:Shape sh:property [ sh:path ex:name ; sh:minCount 1 ] .\n');
		const nested = Array.from(index.entries.values()).filter(entry => entry.nested);

		expect(nested).toHaveLength(1);
		expect(index.summaries).toHaveLength(1);
		expect(index.summaries[0].term).toEqual({ kind: 'iri', iri: `${EX}Shape` });
	});

	it('treats a labelled blank node as a top level resource', () => {
		const index = indexOf('ex:Thing ex:related _:node .\n_:node ex:label "I stand alone" .\n');

		expect(index.summaries.map(summary => summary.term.kind)).toContain('bnode');
	});

	it('counts how often a blank node is referred to', () => {
		const index = indexOf('_:shared a owl:Class .\nex:A rdfs:subClassOf _:shared .\nex:B rdfs:subClassOf _:shared .\n');
		const shared = index.summaries.find(summary => summary.term.kind === 'bnode')!;

		expect(index.referenceCounts.get(shared.id)).toBe(2);
		expect(shared.nested).toBe(false);
	});

	it('counts properties and values separately', () => {
		const index = indexOf('ex:Thing ex:note "a" , "b" , "c" ;\n    ex:other "x" .\n');

		expect(index.summaries[0].propertyCount).toBe(2);
		expect(index.summaries[0].valueCount).toBe(4);
	});

	it('prefers a resolved label over the local part', () => {
		const index = indexOf('ex:Thing a ex:Class .\n', { labels: { [`${EX}Thing`]: 'A Nice Thing' } });

		expect(index.summaries[0].label).toBe('A Nice Thing');
	});

	it('falls back to the prefixed name when no label is defined', () => {
		const index = indexOf('ex:Thing a ex:Class .\n');

		expect(index.summaries[0].label).toBe('ex:Thing');
		expect(index.summaries[0].prefixedName).toBe('ex:Thing');
	});

	it('falls back to the local part of an IRI without a declared prefix', () => {
		const index = indexOf('<http://other.org/vocab#Thing> a ex:Class .\n');

		expect(index.summaries[0].label).toBe('Thing');
		expect(index.summaries[0].prefixedName).toBeUndefined();
	});

	it('describes a summary only with what the document states', () => {
		const stated = indexOf('ex:Thing a ex:Class ; rdfs:comment "Stated." .\n', { predicates: { label: [], description: [RDFS.comment] } });
		const stored = indexOf('ex:Thing a ex:Class .\n', { descriptions: { [`${EX}Thing`]: 'From the store.' } });

		expect(stated.summaries[0].description).toBe('Stated.');
		expect(stored.summaries[0].description).toBeUndefined();
	});

	it('tells whether the document labels a resource', () => {
		const index = indexOf('ex:A a ex:Class ; rdfs:label "A" .\nex:B a ex:Class .\n', { predicates: { label: [RDFS.label], description: [] } });

		expect(index.summaries.map(summary => summary.hasLabel)).toEqual([true, false]);
	});

	it('names the types of a resource and the one it is shown by, passing over owl:NamedIndividual', () => {
		const index = indexOf('ex:A a owl:Class , rdfs:Class .\nex:B a owl:NamedIndividual , skos:Concept .\nex:C ex:p "x" .\n');
		const [a, b, c] = index.summaries;

		expect(a.typeLabels).toEqual(['owl:Class', 'rdfs:Class']);
		expect(a.typeIri).toBe(OWL.Class);
		expect(a.typeLabel).toBe('owl:Class');
		expect(b.typeIri).toBe(SKOS.Concept);
		expect(b.typeLabel).toBe('skos:Concept');
		expect(c.typeLabels).toBeUndefined();
		expect(c.typeIri).toBeUndefined();
	});

	it('marks a resource with the icon of the kind of thing it is', () => {
		const index = indexOf('ex:onto a owl:Ontology .\nex:scheme a skos:ConceptScheme .\nex:thing ex:p "x" .\n');

		expect(index.summaries.map(summary => summary.iconName)).toEqual(['mentor-rdf-ontology', 'mentor-rdf-concept-scheme', 'mentor-rdf-individual']);
	});

	it('collects the datatypes used in the document', () => {
		const index = indexOf('ex:Thing ex:count "1"^^xsd:integer ; ex:when "2026-01-01"^^xsd:date .\n');

		expect(index.datatypes).toEqual([`${_XSD}date`, `${_XSD}integer`]);
	});

	it('lists the declared namespaces sorted by prefix, counting their uses', () => {
		const index = indexOf('ex:A a ex:Class .\nex:B a ex:Class .\n');

		expect(index.namespaces.map(namespace => namespace.prefix)).toEqual(['ex', 'owl', 'rdfs', 'sh', 'skos', 'xsd']);
		expect(index.namespaces.find(namespace => namespace.prefix === 'ex')?.usageCount).toBe(4);
		expect(index.namespaces.find(namespace => namespace.prefix === 'sh')?.usageCount).toBe(0);
	});

	it('records source positions for statements written in the document', () => {
		const index = indexOf('ex:Thing a ex:Class .\n');

		expect(index.summaries[0].position).toEqual({ line: PREAMBLE.split('\n').length - 1, character: 0 });
	});

	it('keeps the list nodes of a collection out of the resource list', () => {
		const index = indexOf('ex:Thing ex:steps ( ex:a ex:b ex:c ) .\n');

		expect(index.summaries).toHaveLength(1);
		expect(index.collectionNodes.size).toBe(3);
		expect(index.collections.size).toBe(1);
	});

	it('reads the items of a collection in order', () => {
		const index = indexOf('ex:Thing ex:steps ( ex:a "b" [ ex:p "c" ] ) .\n');
		const [items] = Array.from(index.collections.values());

		expect(items.map(item => item.term.termType)).toEqual(['NamedNode', 'Literal', 'BlankNode']);
	});
});

describe('ResourceIndexBuilder comments', () => {
	it('carries the runs of comments above a resource on its summary', () => {
		const index = indexOf(`
			# About the file.

			# The thing itself.
			# Written over two lines.
			ex:Thing a ex:Class .
		`);

		expect(index.summaries[0].comments).toEqual([['About the file.'], ['The thing itself.', 'Written over two lines.']]);
	});

	it('keeps the comments closing a document apart from the last resource', () => {
		const index = indexOf(`
			ex:Thing a ex:Class .

			# That is all.
			# Really.

			# Postscript.
		`);

		expect(index.summaries[0].comments).toBeUndefined();
		expect(index.trailingComments).toEqual([['That is all.', 'Really.'], ['Postscript.']]);
	});

	it('leaves a resource without comments unmarked', () => {
		const index = indexOf('ex:Thing a ex:Class .\n');

		expect(index.summaries[0].comments).toBeUndefined();
		expect(index.trailingComments).toEqual([]);
	});
});
