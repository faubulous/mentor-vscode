import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { OWL, RDF, RDFS, _OWL, _RDFS, _SH, _XSD } from '@faubulous/mentor-rdf';
import { ResolvingDocumentContextOptions, createResolvingDocumentContext, readTurtleQuadContexts } from '@src/utilities/mocks/factories';
import { ResourceCardBodyData } from '@src/services/resource/resource-card-data';
import { ResourceIndexOptions, getEntry } from './resource-index';
import { ResourceIndexBuilder } from './resource-index-builder';
import { ResourceViewBuilder } from './resource-view-builder';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

const EX = 'http://example.org/';
const NAMESPACES = { ex: EX, rdfs: _RDFS, owl: _OWL, sh: _SH, xsd: _XSD };
const PREAMBLE = Object.entries(NAMESPACES).map(([prefix, iri]) => `@prefix ${prefix}: <${iri}> .\n`).join('');

/**
 * Build the statements of the first resource of a Turtle body written after the prefix declarations.
 */
function detailOf(body: string, context: ResolvingDocumentContextOptions = {}, options: ResourceIndexOptions = {}): ResourceCardBodyData {
	const documentContext = createResolvingDocumentContext({ namespaces: NAMESPACES, ...context });
	const index = new ResourceIndexBuilder(readTurtleQuadContexts(PREAMBLE + body), documentContext).build();
	const entry = getEntry(index, index.listItems[0].subject)!;

	return new ResourceViewBuilder(index, documentContext, options).buildCardBody(entry);
}

/**
 * Build the statements of the nested node held by the first value of the first resource.
 */
function nestedDetailOf(body: string): ResourceCardBodyData {
	const documentContext = createResolvingDocumentContext({ namespaces: NAMESPACES });
	const index = new ResourceIndexBuilder(readTurtleQuadContexts(PREAMBLE + body), documentContext).build();
	const views = new ResourceViewBuilder(index, documentContext);
	const parent = views.buildCardBody(getEntry(index, index.listItems[0].subject)!);

	return views.buildCardBody(getEntry(index, parent.predicates[0].values[0].nested!.term)!);
}

describe('ResourceViewBuilder.buildStatements', () => {
	it('groups values under their predicate in document order', () => {
		const cardBody = detailOf('ex:Thing a ex:Class ;\n    rdfs:label "First" , "Second" .\n');

		expect(cardBody.predicates).toHaveLength(2);
		expect(cardBody.predicates[1].values.map(value => value.term)).toEqual([
			RdfDataFactory.literal('First'),
			RdfDataFactory.literal('Second')
		]);
	});

	it('preserves language tags on literal values', () => {
		const cardBody = detailOf('ex:Thing rdfs:label "Ding"@de , "Thing"@en .\n');

		expect(cardBody.predicates[0].values.map(value => value.term.termType === 'Literal' ? value.term.language : undefined)).toEqual(['de', 'en']);
	});

	it('names the predicates the way the document writes them', () => {
		const cardBody = detailOf('ex:Thing rdfs:label "x" .\n', { labels: { [RDFS.label]: 'label' } });

		expect(cardBody.predicates[0].predicate).toMatchObject({ term: RdfDataFactory.namedNode(RDFS.label), label: 'label', prefixedName: 'rdfs:label', editable: true });
	});

	it('links a nested blank node object to its own resource', () => {
		const cardBody = detailOf('ex:Shape sh:property [ sh:path ex:name ; sh:minCount 1 ] .\n');
		const nested = cardBody.predicates[0].values[0].nested;

		expect(nested).toBeDefined();
		expect(nested?.propertyCount).toBe(2);
	});

	it('names a blank node the way the definition tree does', () => {
		// A property shape is named by the path it constrains: `sh:path` is one of the label
		// predicates, so the resolver returns it for the blank node.
		const cardBody = detailOf('ex:Shape sh:property [ sh:path ex:name ; sh:minCount 1 ] .\n', { blankNodeLabel: 'name' });

		expect(cardBody.predicates[0].values[0].nested?.label).toBe('name');
	});

	it('leaves a blank node unnamed rather than showing its parser identifier', () => {
		const cardBody = detailOf('ex:Shape sh:property [ sh:minCount 1 ] .\n');

		expect(cardBody.predicates[0].values[0].nested?.label).toBeUndefined();
	});

	it('names the type of a nested node', () => {
		const cardBody = detailOf('ex:Shape sh:property [ a sh:PropertyShape ; sh:path ex:name ] .\n');

		expect(cardBody.predicates[0].values[0].nested?.typeLabel).toBe('sh:PropertyShape');
	});

	it('does not link a labelled blank node, which has a row of its own', () => {
		const cardBody = detailOf('ex:Thing ex:related _:node .\n_:node ex:label "I stand alone" .\n');

		expect(cardBody.predicates[0].values[0].nested).toBeUndefined();
	});

	it('anchors the values of an inline blank node so they can be edited', () => {
		const cardBody = nestedDetailOf('ex:Thing ex:shape [ ex:name "inner" ] .\n');

		expect(cardBody.predicates[0].values[0].anchor).toBe(PREAMBLE.length + 28);
		expect(cardBody.predicates[0].values[0].editable).toBe(true);
	});

	it('shows a collection as its items, in order', () => {
		const cardBody = detailOf('ex:Thing ex:steps ( ex:first ex:second ex:third ) .\n');

		expect(cardBody.predicates[0].values[0].collection?.items.map(item => item.prefixedName)).toEqual(['ex:first', 'ex:second', 'ex:third']);
	});

	it('anchors the items of a collection at their own tokens so they can be edited', () => {
		const cardBody = detailOf('ex:Thing ex:steps ( ex:first ex:second ) .\n');
		const items = cardBody.predicates[0].values[0].collection?.items ?? [];

		expect(items.map(item => item.anchor)).toEqual([PREAMBLE.length + 20, PREAMBLE.length + 29]);
		expect(items.every(item => item.editable)).toBe(true);
	});

	it('hides the statements that chain a collection', () => {
		const cardBody = detailOf('ex:Thing ex:steps ( ex:first ex:second ) .\n');

		expect(cardBody.predicates.map(property => property.predicate.term)).toEqual([RdfDataFactory.namedNode(`${EX}steps`)]);
	});

	it('reads an empty collection as a list with no items', () => {
		const cardBody = detailOf('ex:Thing ex:steps () .\n');

		expect(cardBody.predicates[0].values[0].collection?.items).toEqual([]);
	});

	it('carries the items of a collection of blank nodes', () => {
		// How SHACL writes alternatives: a list whose members are shapes.
		const cardBody = detailOf('ex:Shape sh:or ( [ sh:path ex:a ] [ sh:path ex:b ; sh:minCount 1 ] ) .\n');
		const items = cardBody.predicates[0].values[0].collection?.items ?? [];

		expect(items).toHaveLength(2);
		expect(items.every(item => item.nested !== undefined)).toBe(true);
		expect(items[1].nested?.propertyCount).toBe(2);
	});
});

describe('ResourceViewBuilder predicate ranges', () => {
	it('gives each property the range the options tell for its predicate and resource, and none where they tell none', () => {
		const asked: string[] = [];
		const cardBody = detailOf('ex:Thing rdfs:label "First" ; ex:knows ex:Other .\n', {}, {
			resolvePredicateRange: (predicate, entry) => {
				asked.push(`${entry.term.value} ${predicate}`);

				return predicate === `${EX}knows` ? { type: 'resource', source: 'range' } : undefined;
			}
		});
		const ranges = Object.fromEntries(cardBody.predicates.map(property => [property.predicate.prefixedName, property.range]));

		expect(ranges).toEqual({ 'rdfs:label': undefined, 'ex:knows': { type: 'resource', source: 'range' } });
		expect(asked).toEqual([`${EX}Thing ${_RDFS}label`, `${EX}Thing ${EX}knows`]);
	});
});

describe('ResourceViewBuilder resource marks', () => {
	it('marks IRI values with the glyph of the resource', () => {
		const cardBody = detailOf('ex:Thing ex:knows ex:Other ; ex:type ex:Kind ; ex:label "text" .\nex:Kind a owl:Class .\n', {}, {
			resolveObjectIcon: iri => iri === `${EX}Other` ? 'mentor-rdf-individual' : undefined
		});
		const [knows, type, label] = cardBody.predicates;

		// Not described in the document: the resolver decides.
		expect(knows.values[0]).toMatchObject({ iconName: 'mentor-rdf-individual' });
		// Described in the document: its own type decides.
		expect(type.values[0]).toMatchObject({ iconName: 'mentor-rdf-class' });
		expect(label.values[0].iconName).toBeUndefined();
	});

	it('takes the glyph of a resource the document only mentions from the store', () => {
		const cardBody = detailOf('ex:A rdfs:subClassOf ex:B .\nex:B rdfs:label "B" .\n', {}, { resolveObjectIcon: () => 'mentor-rdf-class' });

		expect(cardBody.predicates[0].values[0].iconName).toBe('mentor-rdf-class');
	});

	it('marks the IRI items of a collection', () => {
		const cardBody = detailOf('ex:Thing ex:steps ( ex:A "b" ) .\n', {}, { resolveObjectIcon: () => 'symbol-constant' });
		const items = cardBody.predicates[0].values[0].collection!.items;

		expect(items[0].iconName).toBe('symbol-constant');
		expect(items[1].iconName).toBeUndefined();
	});
});

describe('ResourceViewBuilder.buildPredicateView', () => {
	it('names a predicate the document does not state as the predicates of the rows are named', () => {
		const documentContext = createResolvingDocumentContext({ namespaces: NAMESPACES, labels: { [RDFS.comment]: 'comment' } });
		const index = new ResourceIndexBuilder([], documentContext).build();

		expect(new ResourceViewBuilder(index, documentContext).buildPredicateView(RDFS.comment)).toEqual({
			term: RdfDataFactory.namedNode(RDFS.comment),
			label: 'comment',
			labelLanguage: undefined,
			prefixedName: 'rdfs:comment',
			editable: true
		});
	});
});

describe('ResourceViewBuilder comments', () => {
	it('carries the comments of a document to the things they were written about', () => {
		const cardBody = detailOf(`
			# The thing itself.
			# Written over two lines.
			ex:Thing a ex:Class ;
			         # what it is called
			         rdfs:label "First" , # a note on the line
			                    # about the second one
			                    "Second" .
		`);
		const [type, label] = cardBody.predicates;

		// What introduces a resource stands outside its card, so its list item carries it, not its card body.
		expect(cardBody.leadingComments).toBeUndefined();
		expect(type.comments).toBeUndefined();
		expect(label.comments).toEqual(['what it is called']);
		expect(label.values[0].comments).toBeUndefined();
		expect(label.values[1].comments).toEqual(['about the second one']);
	});

	it('gives a comment above a statement whose value is a blank node to that value, first or not', () => {
		const cardBody = detailOf(`
			ex:Shape a sh:NodeShape ;
			    # the first one
			    sh:property [ sh:path ex:a ] ;
			    # the second one
			    sh:property [ sh:path ex:b ] ;
			    # about the class
			    sh:class ex:Thing .
		`);
		const [, property, cls] = cardBody.predicates;

		expect(property.comments).toBeUndefined();
		expect(property.values[0].comments).toEqual(['the first one']);
		expect(property.values[1].comments).toEqual(['the second one']);
		expect(cls.comments).toEqual(['about the class']);
	});

	it('keeps the comments of a node written inside another with its card', () => {
		const nested = nestedDetailOf(`
			ex:Thing ex:has [
				# what the node is for
				ex:p "x"
			] .
		`);

		expect(nested.leadingComments).toEqual(['what the node is for']);
	});
});

describe('ResourceViewBuilder, with the statements the reasoner infers', () => {
	const thing = RdfDataFactory.namedNode(`${EX}Thing`);

	/**
	 * A statement the reasoner infers about the thing.
	 * @param predicate The IRI of the predicate.
	 * @param object The IRI of the object.
	 * @returns The statement.
	 */
	const inferredQuad = (predicate: string, object: string) => RdfDataFactory.quad(thing, RdfDataFactory.namedNode(predicate), RdfDataFactory.namedNode(object));

	it('shows an inferred value after the asserted values of its predicate, and a predicate only inferred after the others, read-only', () => {
		const inferred = [inferredQuad(RDF.type, OWL.NamedIndividual), inferredQuad(RDFS.seeAlso, `${EX}Other`)];
		const cardBody = detailOf('ex:Thing a ex:Class ;\n    rdfs:label "Thing" .\n', {}, { inferredQuadsOf: () => inferred });
		const rows = cardBody.predicates.map(property => [property.predicate.term.value, property.values.map(value => [value.term.value, value.inferred === true, value.editable, value.anchor !== undefined])]);

		expect(rows).toEqual([
			[RDF.type, [[`${EX}Class`, false, true, true], [OWL.NamedIndividual, true, false, false]]],
			[RDFS.label, [['Thing', false, true, true]]],
			[RDFS.seeAlso, [[`${EX}Other`, true, false, false]]]
		]);
		expect(cardBody.predicates[2].predicate.editable).toBe(false);
	});

	it('names the types the store gives a resource besides those it asserts as inferred', () => {
		const documentContext = createResolvingDocumentContext({ namespaces: NAMESPACES });
		const options: ResourceIndexOptions = { shownTypesOf: () => [`${EX}Class`, OWL.NamedIndividual] };
		const index = new ResourceIndexBuilder(readTurtleQuadContexts(PREAMBLE + 'ex:Thing a ex:Class .\n'), documentContext, options).build();

		expect(index.listItems[0]).toMatchObject({ typeLabels: ['ex:Class'], inferredTypeLabels: ['owl:NamedIndividual'] });
	});

	it('names no inferred type where the store gives a resource none but those it asserts', () => {
		const documentContext = createResolvingDocumentContext({ namespaces: NAMESPACES });
		const index = new ResourceIndexBuilder(readTurtleQuadContexts(PREAMBLE + 'ex:Thing a ex:Class .\n'), documentContext, { shownTypesOf: () => [`${EX}Class`] }).build();

		expect(index.listItems[0].inferredTypeLabels).toBeUndefined();
	});
});
