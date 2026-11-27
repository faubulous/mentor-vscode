import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import * as vscode from 'vscode';
import { OWL, OwlReasoner, RDF, RDFS, Store, _OWL, _RDFS } from '@faubulous/mentor-rdf';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { ResourceReferenceProvider } from '@src/providers/resource-reference-provider';
import { createTurtleDocument } from '@src/utilities/mocks/factories';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { ResourceCardService } from './resource-card-service';

const EX = 'http://example.org/';

const VOCABULARY = `@prefix ex: <${EX}> .
@prefix owl: <${_OWL}> .
@prefix rdfs: <${_RDFS}> .

ex:Tree a owl:Class .
ex:Oak a ex:Tree ;
	rdfs:label "Oak" ;
	rdfs:comment "A tree of the genus Quercus." ;
	ex:leaf [ a ex:Leaf ; ex:shape "lobed" ] .
`;

/**
 * A service over a store holding the vocabulary, with a reasoner, whose references the given
 * count tells, and pins for the type `ex:Tree`.
 * @param references How often each IRI is referred to.
 * @returns The service, the store and a context to show cards for.
 */
function createService(references: Record<string, number> = {}) {
	const store = new Store(new OwlReasoner());

	store.loadTurtle(VOCABULARY, 'file:///w/vocabulary.ttl', true);

	const referenceProvider = { countReferencesForIri: (iri: string) => references[iri] ?? 0 } as unknown as ResourceReferenceProvider;
	const context = createTurtleDocument('file:///w/data.ttl', RdfSyntax.Turtle, { store });

	context.predicates.label.push(RDFS.label);
	context.predicates.description.push(RDFS.comment);

	vi.spyOn(vscode.workspace, 'getConfiguration').mockReturnValue({ get: (_key: string, value?: unknown) => value, inspect: () => ({ workspaceValue: { [`${EX}Tree`]: [RDFS.comment] } }) } as unknown as vscode.WorkspaceConfiguration);

	return { service: new ResourceCardService(store, referenceProvider), store, context };
}

describe('ResourceCardService', () => {
	it('builds the card of a resource of the store with its usage count and the pins of its types', () => {
		const { service, context } = createService({ [`${EX}Oak`]: 4 });
		const card = service.getStoreCard(RdfDataFactory.namedNode(`${EX}Oak`), context)!;

		expect(card.cardHeader).toMatchObject({ label: 'Oak', typeIri: `${EX}Tree`, description: 'A tree of the genus Quercus.', usageCount: 3 });
		expect(card.cardHeader.pins).toEqual([{ predicate: RdfDataFactory.namedNode(RDFS.comment), scope: 'workspace' }]);
		expect(card.cardBody.predicates.map(property => property.predicate.term.value)).toEqual([RDF.type, RDFS.label, RDFS.comment, `${EX}leaf`]);
	});

	it('builds the card of a blank node of the store, used as often as statements refer to it', () => {
		const { service, store, context } = createService();
		const leaf = Array.from(store.matchAll(undefined, RdfDataFactory.namedNode(`${EX}Oak`), RdfDataFactory.namedNode(`${EX}leaf`), null, false))[0].object as ReturnType<typeof RdfDataFactory.blankNode>;
		const card = service.getStoreCard(leaf, context)!;

		expect(card.cardHeader).toMatchObject({ typeIri: `${EX}Leaf` });
		expect(card.cardHeader.usageCount).toBe(1);
		expect(card.cardBody.predicates.map(property => property.predicate.term.value)).toEqual([RDF.type, `${EX}shape`]);
	});

	it('has no card for a resource the store states nothing about', () => {
		const { service, context } = createService();

		expect(service.getStoreCard(RdfDataFactory.namedNode(`${EX}Unknown`), context)).toBeUndefined();
	});

	it('reads the inferred types again once the store changed', () => {
		const { service, store } = createService();
		const oak = RdfDataFactory.namedNode(`${EX}Oak`);

		expect(service.getInferredTypes(undefined, oak)).toContain(OWL.NamedIndividual);

		store.loadTurtle(`@prefix ex: <${EX}> .\nex:Oak a ex:Deciduous .`, 'file:///w/more.ttl', true);

		expect(service.getInferredTypes(undefined, oak)).toContain(`${EX}Deciduous`);
	});

	it('reads the statements inferred about a resource that no graph asserts as well', () => {
		const { service, store } = createService();

		store.loadTurtle(`@prefix ex: <${EX}> .\n@prefix owl: <${_OWL}> .\nex:Pine a ex:Tree, owl:NamedIndividual .`, 'file:///w/pine.ttl', true);

		const statementsOf = (iri: string) => service.getInferredQuads(undefined, RdfDataFactory.namedNode(iri)).map(quad => `${quad.predicate.value} ${quad.object.value}`);

		expect(statementsOf(`${EX}Oak`)).toEqual([`${RDF.type} ${OWL.NamedIndividual}`]);
		expect(statementsOf(`${EX}Pine`)).toEqual([]);
		expect(statementsOf(`${EX}Tree`)).toEqual([`${RDF.type} ${RDFS.Class}`]);
	});

	it('reads the inferred statements once until the store changes', () => {
		const { service, store } = createService();
		const oak = RdfDataFactory.namedNode(`${EX}Oak`);
		const first = service.getInferredQuads(['file:///w/vocabulary.ttl'], oak);

		expect(service.getInferredQuads(['file:///w/vocabulary.ttl'], oak)).toBe(first);

		store.loadTurtle(`@prefix ex: <${EX}> .\nex:Elm a ex:Tree .`, 'file:///w/more.ttl', true);

		expect(service.getInferredQuads(['file:///w/vocabulary.ttl'], oak)).not.toBe(first);
	});

	it('reads no inferred statements from a store without a reasoner', () => {
		const store = new Store();

		store.loadTurtle(VOCABULARY, 'file:///w/vocabulary.ttl', true);

		const service = new ResourceCardService(store, {} as ResourceReferenceProvider);

		expect(service.getInferredQuads(undefined, RdfDataFactory.namedNode(`${EX}Oak`))).toEqual([]);
	});

	it('shows the inferred statements and types on the card of a resource of the store, read-only', () => {
		const { service, context } = createService();
		const card = service.getStoreCard(RdfDataFactory.namedNode(`${EX}Oak`), context)!;
		const types = card.cardBody.predicates.find(property => property.predicate.term.value === RDF.type)!;

		expect(types.values.map(value => [value.term.value, value.inferred === true, value.editable])).toEqual([
			[`${EX}Tree`, false, false],
			[OWL.NamedIndividual, true, false]
		]);
		expect(card.cardHeader.inferredTypeLabels).toEqual(['NamedIndividual']);
	});

	it('names the types of a resource without those that are superclasses of its other types', () => {
		const { service, store } = createService();
		const oak = RdfDataFactory.namedNode(`${EX}Oak`);

		store.loadTurtle(`@prefix ex: <${EX}> .\n@prefix owl: <${_OWL}> .\n@prefix rdfs: <${_RDFS}> .\nex:Tree rdfs:subClassOf owl:NamedIndividual .`, 'file:///w/classes.ttl', true);

		expect(service.getInferredTypes(undefined, oak)).toEqual(expect.arrayContaining([`${EX}Tree`, OWL.NamedIndividual]));
		expect(service.getShownTypes(undefined, oak)).toEqual([`${EX}Tree`]);
		expect(service.getInferredQuads(undefined, oak).map(quad => quad.object.value)).toContain(OWL.NamedIndividual);
		expect(service.getShownInferredQuads(undefined, oak).map(quad => quad.object.value)).not.toContain(OWL.NamedIndividual);
	});

	it('keeps the types of a resource that are superclasses of each other', () => {
		const { service, store } = createService();
		const oak = RdfDataFactory.namedNode(`${EX}Oak`);

		store.loadTurtle(`@prefix ex: <${EX}> .\n@prefix owl: <${_OWL}> .\n@prefix rdfs: <${_RDFS}> .\nex:Tree rdfs:subClassOf owl:NamedIndividual .\nowl:NamedIndividual rdfs:subClassOf ex:Tree .`, 'file:///w/classes.ttl', true);

		expect([...service.getShownTypes(undefined, oak)].sort()).toEqual([`${EX}Tree`, OWL.NamedIndividual].sort());
	});

	it('counts the usages of a resource without the statement that defines it', () => {
		const { service } = createService({ [`${EX}Oak`]: 1 });

		expect(service.countUsages(`${EX}Oak`)).toBe(0);
		expect(service.countUsages(`${EX}Unknown`)).toBe(0);
	});
});
