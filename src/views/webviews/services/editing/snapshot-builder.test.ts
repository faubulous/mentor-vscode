import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { RDFS, SKOS, _OWL, _RDFS, _SKOS } from '@faubulous/mentor-rdf';
import { createResolvingDocumentContext, readTurtleQuadContexts } from '@src/utilities/mocks/factories';
import { DocumentSnapshot } from '@src/views/webviews/views/form-editor/form-editor-model';
import { SnapshotBuilder } from './snapshot-builder';

const EX = 'http://example.org/';
const DCTERMS = 'http://purl.org/dc/terms/';
const NAMESPACES = { ex: EX, owl: _OWL, rdfs: _RDFS, skos: _SKOS, dct: DCTERMS };
const PREAMBLE = Object.entries(NAMESPACES).map(([prefix, iri]) => `@prefix ${prefix}: <${iri}> .\n`).join('');

/**
 * Build the snapshot of a Turtle body written after the prefix declarations.
 */
function snapshotOf(body: string, activeLanguage?: string): DocumentSnapshot {
	const context = createResolvingDocumentContext({
		namespaces: NAMESPACES,
		activeLanguage,
		predicates: { label: [SKOS.prefLabel, RDFS.label], description: [SKOS.definition, RDFS.comment] }
	});

	return new SnapshotBuilder({
		version: 7,
		uri: 'file:///workspace/vocab.ttl',
		quadContexts: readTurtleQuadContexts(PREAMBLE + body),
		context,
		countUsages: () => 3
	}).build().snapshot;
}

describe('SnapshotBuilder', () => {
	it('stamps the document version so stale messages can be discarded', () => {
		expect(snapshotOf('ex:A a owl:Class .').version).toBe(7);
	});

	it('reports the file name and syntax of the document', () => {
		const snapshot = snapshotOf('ex:A a owl:Class .');

		expect(snapshot.fileName).toBe('vocab.ttl');
		expect(snapshot.syntax).toBe('turtle');
	});

	it('keeps the resources in document order, naming the resource describing the document wherever it is written', () => {
		const snapshot = snapshotOf(`
			ex:A a owl:Class .
			ex:onto a owl:Ontology ; dct:title "Onto" .
			ex:B a owl:Class .
			ex:scheme a skos:ConceptScheme .
			ex:C a owl:Class .
		`);

		expect(snapshot.resources.map(resource => resource.prefixedName)).toEqual(['ex:A', 'ex:onto', 'ex:B', 'ex:scheme', 'ex:C']);
		expect(snapshot.documentResourceId).toBe(`i:${EX}onto`);
	});

	it('carries the active language so the webview can mark fallback values', () => {
		expect(snapshotOf('ex:A a owl:Class .', 'de').activeLanguage).toBe('de');
	});

	it('lists the declared namespaces sorted by prefix', () => {
		expect(snapshotOf('ex:A a owl:Class .').namespaces.map(namespace => namespace.prefix)).toEqual(['dct', 'ex', 'owl', 'rdfs', 'skos']);
	});

	it('names the types of a resource, counts its usages and detects the scheme of the document', () => {
		const snapshot = snapshotOf(`
			ex:A a owl:Class ; rdfs:label "A" ; rdfs:comment "About A" .
			ex:B a owl:Class , rdfs:Class ; rdfs:label "B" .
		`);

		expect(snapshot.resources.map(resource => resource.typeLabels)).toEqual([['owl:Class'], ['owl:Class', 'rdfs:Class']]);
		expect(snapshot.resources.map(resource => resource.usageCount)).toEqual([3, 3]);
		expect(snapshot.resources[0].description).toBe('About A');
		expect(snapshot.annotationScheme.label).toMatchObject({ term: { kind: 'iri', iri: RDFS.label }, prefixedName: 'rdfs:label' });
		expect(snapshot.annotationScheme.description?.term).toEqual({ kind: 'iri', iri: RDFS.comment });
	});

	it('counts the usages of a blank node of the list within the document', () => {
		const snapshot = snapshotOf(`
			_:shared a owl:Class .
			ex:A rdfs:subClassOf _:shared .
			ex:B rdfs:subClassOf _:shared .
		`);

		expect(snapshot.resources.find(resource => resource.term.kind === 'bnode')?.usageCount).toBe(2);
	});

	it('heads a vocabulary with its concept scheme', () => {
		const snapshot = snapshotOf(`
			<http://other.org/scheme> a skos:ConceptScheme .
			ex:A a skos:Concept ; skos:inScheme <http://other.org/scheme> .
			ex:B a skos:Concept ; skos:topConceptOf <http://other.org/scheme> .
		`);

		expect(snapshot.documentResourceId).toBe('i:http://other.org/scheme');
	});

	it('heads a document with its ontology before a concept scheme', () => {
		const snapshot = snapshotOf('ex:scheme a skos:ConceptScheme .\nex:onto a owl:Ontology .');

		expect(snapshot.documentResourceId).toBe(`i:${EX}onto`);
	});

	it('heads a document with the ontology that describes itself before one that is only declared', () => {
		const snapshot = snapshotOf(`
			<http://example.org/> a owl:Ontology .
			ex:A a owl:Class .
			<http://example.org/onto> a owl:Ontology ; rdfs:label "Plants" .
		`);

		expect(snapshot.documentResourceId).toBe(`i:${EX}onto`);
	});

	it('leaves a document without an ontology or scheme headless', () => {
		expect(snapshotOf('ex:A a owl:Class .').documentResourceId).toBeUndefined();
	});

	it('marks the terms of other vocabularies that are only declared', () => {
		const snapshot = snapshotOf(`
			rdfs:label a owl:AnnotationProperty .
			ex:A a owl:Class .
			ex:B a owl:Class .
		`);

		expect(snapshot.resources.map(resource => resource.externalDeclaration)).toEqual([true, undefined, undefined]);
	});

	it('tells the type most definitions have, the resource describing the document aside', () => {
		const snapshot = snapshotOf(`
			ex:scheme a skos:ConceptScheme .
			ex:tools a skos:Concept ; skos:prefLabel "tools"@en .
			ex:awl a skos:Concept ; skos:prefLabel "awl"@en .
			ex:bindings a skos:Collection ; skos:prefLabel "bindings"@en .
			ex:extra a skos:Concept, owl:NamedIndividual ; skos:prefLabel "extra"@en .
		`);
		const extra = snapshot.resources.find(resource => resource.prefixedName === 'ex:extra');

		expect(snapshot.dominantTypeIri).toBe(SKOS.Concept);
		expect(extra?.typeIri).toBe(SKOS.Concept);
	});

	it('reads descriptions in the active language, the first description predicate first', () => {
		const snapshot = snapshotOf(`
			ex:tools a skos:Concept ; rdfs:comment "A comment."@en ; skos:definition "The tools."@en , "Les outils."@fr .
			ex:awl a skos:Concept ; rdfs:comment "Only a comment."@en .
		`, 'fr');
		const describe = (name: string) => snapshot.resources.find(resource => resource.prefixedName === name)?.description;

		expect(describe('ex:tools')).toBe('Les outils.');
		expect(describe('ex:awl')).toBe('Only a comment.');
	});

	it('carries the problems and the reason the document is read only', () => {
		const context = createResolvingDocumentContext({ namespaces: NAMESPACES });
		const { snapshot } = new SnapshotBuilder({
			version: 1,
			uri: 'file:///workspace/vocab.ttl',
			quadContexts: [],
			context,
			readOnly: { reason: 'syntaxErrors', message: 'The document has syntax errors.' },
			problems: [{ message: 'Unexpected token', line: 3, character: 4 }]
		}).build();

		expect(snapshot.readOnly?.reason).toBe('syntaxErrors');
		expect(snapshot.problems).toHaveLength(1);
	});

	it('produces an empty resource list for an empty document', () => {
		const snapshot = snapshotOf('');

		expect(snapshot.resources).toEqual([]);
		expect(snapshot.datatypes).toEqual([]);
		expect(snapshot.problems).toEqual([]);
	});
});

describe('SnapshotBuilder comments', () => {
	it('carries the comments closing the document, and none when there are none', () => {
		expect(snapshotOf('ex:A a owl:Class .\n\n# The end.\n# Really.\n').trailingComments).toEqual([['The end.', 'Really.']]);
		expect(snapshotOf('ex:A a owl:Class .').trailingComments).toBeUndefined();
	});
});
