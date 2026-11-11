import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { RDFS, SKOS, _OWL, _RDFS, _SKOS } from '@faubulous/mentor-rdf';
import { createResolvingDocumentContext, readTurtleQuadContexts } from '@src/utilities/mocks/factories';
import { DocumentSnapshot } from '@src/views/webviews/views/form-editor/form-editor-model';
import { PinnedPropertiesService } from './pinned-properties-service';
import { EditorSnapshotService, SnapshotInput } from './editor-snapshot-service';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

const EX = 'http://example.org/';
const DCTERMS = 'http://purl.org/dc/terms/';
const NAMESPACES = { ex: EX, owl: _OWL, rdfs: _RDFS, skos: _SKOS, dct: DCTERMS };
const PREAMBLE = Object.entries(NAMESPACES).map(([prefix, iri]) => `@prefix ${prefix}: <${iri}> .\n`).join('');

/**
 * Build the snapshot of a Turtle body written after the prefix declarations.
 */
function snapshotOf(body: string, activeLanguage?: string, extra: Partial<SnapshotInput> = {}): DocumentSnapshot {
	const context = createResolvingDocumentContext({
		namespaces: NAMESPACES,
		activeLanguage,
		predicates: { label: [SKOS.prefLabel, RDFS.label], description: [SKOS.definition, RDFS.comment] }
	});

	return new EditorSnapshotService({
		version: 7,
		revision: 1,
		uri: 'file:///workspace/vocab.ttl',
		quadContexts: readTurtleQuadContexts(PREAMBLE + body),
		context,
		countUsages: () => 3,
		...extra
	}).build().snapshot;
}

describe('EditorSnapshotService', () => {
	it('stamps the document version so stale messages can be discarded', () => {
		expect(snapshotOf('ex:A a owl:Class .').version).toBe(7);
	});

	it('names the language the document is read in, in lower case', () => {
		expect(snapshotOf('ex:A a owl:Class .', 'en-US').activeLanguage).toBe('en-us');
		expect(snapshotOf('ex:A a owl:Class .').activeLanguage).toBeUndefined();
	});

	it('names the properties pinned for the asserted types of a resource, leaving out the type and the labels, and none for an untyped one, which cannot pin', () => {
		const pins = PinnedPropertiesService.fromLayers({ [_OWL + 'Class']: [RDFS.label, `${_RDFS}subClassOf`, `${_RDFS}comment`] }, {});
		const snapshot = snapshotOf('ex:A a owl:Class ; rdfs:label "A" ; rdfs:comment "a class" .\nex:B ex:p "x" .', undefined, { pins });
		const [classA, untyped] = snapshot.resources;

		expect(classA.pins).toEqual([
			{ predicate: RdfDataFactory.namedNode(`${_RDFS}subClassOf`), scope: 'workspace' },
			{ predicate: RdfDataFactory.namedNode(`${_RDFS}comment`), scope: 'workspace' }
		]);
		expect(untyped.pins).toBeUndefined();
	});

	it('pins by the types the store infers, as for an untyped blank node a property shape is', () => {
		const sh = 'http://www.w3.org/ns/shacl#';
		const pins = PinnedPropertiesService.fromLayers({ [`${sh}PropertyShape`]: [`${sh}path`] }, {});
		const snapshot = snapshotOf('[] ex:p "x" .', undefined, { pins, inferredTypesOf: () => [`${sh}PropertyShape`] });
		const [shape] = snapshot.resources;

		expect(shape.pins).toEqual([{ predicate: RdfDataFactory.namedNode(`${sh}path`), scope: 'workspace' }]);
	});

	it('names the description predicates and the settings a property can be pinned in', () => {
		const snapshot = snapshotOf('ex:A a owl:Class .', undefined, { pinScopes: ['user', 'workspace'] });

		expect(snapshot.descriptionPredicates.map(predicate => predicate.value)).toEqual([SKOS.definition, RDFS.comment]);
		expect(snapshot.pinScopes).toEqual(['user', 'workspace']);
	});

	it('names the label predicates Mentor is configured with, most preferred first', () => {
		expect(snapshotOf('ex:A a owl:Class .').labelPredicates.map(predicate => predicate.value)).toEqual([SKOS.prefLabel, RDFS.label]);
	});

	it('names the local part of the IRI of a resource, which a rename changes as F2 does', () => {
		const snapshot = snapshotOf(`
			ex:A a owl:Class .
			<http://other.org/ns#Thing> a owl:Class .
			[] a owl:Class .
		`);

		expect(snapshot.resources.map(resource => resource.localPart)).toEqual(['A', 'Thing', undefined]);
	});

	it('reports the file name of the document', () => {
		const snapshot = snapshotOf('ex:A a owl:Class .');

		expect(snapshot.fileName).toBe('vocab.ttl');
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
		expect(snapshot.documentResource?.value).toBe(`${EX}onto`);
	});

	it('lists the declared namespaces sorted by prefix', () => {
		expect(snapshotOf('ex:A a owl:Class .').namespaces.map(namespace => namespace.prefix)).toEqual(['dct', 'ex', 'owl', 'rdfs', 'skos']);
	});

	it('describes a resource and counts its usages', () => {
		const snapshot = snapshotOf(`
			ex:A a owl:Class ; rdfs:label "A" ; rdfs:comment "About A" .
			ex:B a owl:Class , rdfs:Class ; rdfs:label "B" .
		`);

		expect(snapshot.resources.map(resource => resource.typeLabel)).toEqual(['owl:Class', 'owl:Class']);
		expect(snapshot.resources.map(resource => resource.typeLabels)).toEqual([['owl:Class'], ['owl:Class', 'rdfs:Class']]);
		expect(snapshot.resources.map(resource => resource.usageCount)).toEqual([3, 3]);
		expect(snapshot.resources[0].description).toBe('About A');
	});

	it('counts the usages of a blank node of the list within the document', () => {
		const snapshot = snapshotOf(`
			_:shared a owl:Class .
			ex:A rdfs:subClassOf _:shared .
			ex:B rdfs:subClassOf _:shared .
		`);

		expect(snapshot.resources.find(resource => resource.term.termType === 'BlankNode')?.usageCount).toBe(2);
	});

	it('heads a vocabulary with its concept scheme', () => {
		const snapshot = snapshotOf(`
			<http://other.org/scheme> a skos:ConceptScheme .
			ex:A a skos:Concept ; skos:inScheme <http://other.org/scheme> .
			ex:B a skos:Concept ; skos:topConceptOf <http://other.org/scheme> .
		`);

		expect(snapshot.documentResource?.value).toBe('http://other.org/scheme');
	});

	it('heads a document with its ontology before a concept scheme', () => {
		const snapshot = snapshotOf('ex:scheme a skos:ConceptScheme .\nex:onto a owl:Ontology .');

		expect(snapshot.documentResource?.value).toBe(`${EX}onto`);
	});

	it('heads a document with the ontology that describes itself before one that is only declared', () => {
		const snapshot = snapshotOf(`
			<http://example.org/> a owl:Ontology .
			ex:A a owl:Class .
			<http://example.org/onto> a owl:Ontology ; rdfs:label "Plants" .
		`);

		expect(snapshot.documentResource?.value).toBe(`${EX}onto`);
	});

	it('leaves a document without an ontology or scheme headless', () => {
		expect(snapshotOf('ex:A a owl:Class .').documentResource).toBeUndefined();
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
		const { snapshot } = new EditorSnapshotService({
			version: 1,
			revision: 1,
			uri: 'file:///workspace/vocab.ttl',
			quadContexts: [],
			context,
			readOnly: 'syntaxErrors',
			problems: [{ message: 'Unexpected token', line: 3, character: 4 }]
		}).build();

		expect(snapshot.readOnly).toBe('syntaxErrors');
		expect(snapshot.problems).toHaveLength(1);
	});

	it('produces an empty resource list for an empty document', () => {
		const snapshot = snapshotOf('');

		expect(snapshot.resources).toEqual([]);
		expect(snapshot.problems).toEqual([]);
	});
});

describe('EditorSnapshotService comments', () => {
	it('carries the comments closing the document, and none when there are none', () => {
		expect(snapshotOf('ex:A a owl:Class .\n\n# The end.\n# Really.\n').trailingComments).toEqual([['The end.', 'Really.']]);
		expect(snapshotOf('ex:A a owl:Class .').trailingComments).toBeUndefined();
	});
});
