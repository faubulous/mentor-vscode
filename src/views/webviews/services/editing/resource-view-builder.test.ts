import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { RDFS, _OWL, _RDFS, _SH, _XSD } from '@faubulous/mentor-rdf';
import { ResolvingDocumentContextOptions, createResolvingDocumentContext, readTurtleQuadContexts } from '@src/utilities/mocks/factories';
import { ResourceDetail } from '@src/views/webviews/views/form-editor/form-editor-model';
import { ResourceIndexOptions } from './resource-index';
import { ResourceIndexBuilder } from './resource-index-builder';
import { ResourceViewBuilder } from './resource-view-builder';

const EX = 'http://example.org/';
const NAMESPACES = { ex: EX, rdfs: _RDFS, owl: _OWL, sh: _SH, xsd: _XSD };
const PREAMBLE = Object.entries(NAMESPACES).map(([prefix, iri]) => `@prefix ${prefix}: <${iri}> .\n`).join('');

/**
 * Build the detail of the first resource of a Turtle body written after the prefix declarations.
 */
function detailOf(body: string, context: ResolvingDocumentContextOptions = {}, options: ResourceIndexOptions = {}): ResourceDetail {
	const documentContext = createResolvingDocumentContext({ namespaces: NAMESPACES, ...context });
	const index = new ResourceIndexBuilder(readTurtleQuadContexts(PREAMBLE + body), documentContext).build();
	const entry = index.entries.get(index.summaries[0].id)!;

	return new ResourceViewBuilder(index, documentContext, options).buildDetail(entry);
}

/**
 * Build the detail of the nested node held by the first value of the first resource.
 */
function nestedDetailOf(body: string): ResourceDetail {
	const documentContext = createResolvingDocumentContext({ namespaces: NAMESPACES });
	const index = new ResourceIndexBuilder(readTurtleQuadContexts(PREAMBLE + body), documentContext).build();
	const views = new ResourceViewBuilder(index, documentContext);
	const parent = views.buildDetail(index.entries.get(index.summaries[0].id)!);

	return views.buildDetail(index.entries.get(parent.properties[0].values[0].nested!.id)!);
}

describe('ResourceViewBuilder.buildDetail', () => {
	it('groups values under their predicate in document order', () => {
		const detail = detailOf('ex:Thing a ex:Class ;\n    rdfs:label "First" , "Second" .\n');

		expect(detail.properties).toHaveLength(2);
		expect(detail.properties[1].values.map(value => value.term)).toEqual([
			{ kind: 'literal', value: 'First', language: undefined, datatype: `${_XSD}string` },
			{ kind: 'literal', value: 'Second', language: undefined, datatype: `${_XSD}string` }
		]);
	});

	it('preserves language tags on literal values', () => {
		const detail = detailOf('ex:Thing rdfs:label "Ding"@de , "Thing"@en .\n');

		expect(detail.properties[0].values.map(value => value.term.kind === 'literal' ? value.term.language : undefined)).toEqual(['de', 'en']);
	});

	it('names the predicates the way the document writes them', () => {
		const detail = detailOf('ex:Thing rdfs:label "x" .\n', { labels: { [RDFS.label]: 'label' } });

		expect(detail.properties[0].predicate).toMatchObject({ term: { kind: 'iri', iri: RDFS.label }, label: 'label', prefixedName: 'rdfs:label', editable: true });
	});

	it('resolves the description across the indexed documents, naming the predicate when the document states one', () => {
		const stored = detailOf('ex:Thing a ex:Class .\n', { descriptions: { [`${EX}Thing`]: 'A thing of some kind.' } });
		const stated = detailOf('ex:Thing rdfs:comment "Stated." .\n', { descriptions: { [`${EX}Thing`]: 'Stored.' }, predicates: { label: [], description: [RDFS.comment] } });

		expect(stored.description).toBe('A thing of some kind.');
		expect(stored.descriptionPredicate).toBeUndefined();
		expect(stated.description).toBe('Stated.');
		expect(stated.descriptionPredicate).toBe(RDFS.comment);
	});

	it('names the predicate the label was read from', () => {
		const detail = detailOf('ex:Thing rdfs:label "x" .\n', { predicates: { label: [RDFS.label], description: [] } });

		expect(detail.labelPredicate).toBe(RDFS.label);
	});

	it('links a nested blank node object to its own resource', () => {
		const detail = detailOf('ex:Shape sh:property [ sh:path ex:name ; sh:minCount 1 ] .\n');
		const nested = detail.properties[0].values[0].nested;

		expect(nested).toBeDefined();
		expect(nested?.propertyCount).toBe(2);
	});

	it('names a blank node the way the definition tree does', () => {
		// A property shape is named by the path it constrains: `sh:path` is one of the label
		// predicates, so the resolver returns it for the blank node.
		const detail = detailOf('ex:Shape sh:property [ sh:path ex:name ; sh:minCount 1 ] .\n', { blankNodeLabel: 'name' });

		expect(detail.properties[0].values[0].nested?.label).toBe('name');
	});

	it('leaves a blank node unnamed rather than showing its parser identifier', () => {
		const detail = detailOf('ex:Shape sh:property [ sh:minCount 1 ] .\n');

		expect(detail.properties[0].values[0].nested?.label).toBeUndefined();
	});

	it('names the type of a nested node', () => {
		const detail = detailOf('ex:Shape sh:property [ a sh:PropertyShape ; sh:path ex:name ] .\n');

		expect(detail.properties[0].values[0].nested?.typeLabel).toBe('sh:PropertyShape');
	});

	it('marks a blank node with the icon of the kind of thing it is', () => {
		const typed = detailOf('ex:Shape sh:property [ a sh:PropertyShape ; sh:path ex:name ] .\n');
		// How shapes are written in practice: no `a sh:PropertyShape`, just the constraint.
		const untyped = detailOf('ex:Shape sh:property [ sh:path ex:name ; sh:minCount 1 ] .\n');
		const refined = detailOf('ex:Shape sh:property [ sh:path ex:name ; sh:datatype xsd:string ] .\n');

		expect(typed.properties[0].values[0].nested?.iconName).toBe('mentor-rdf-shape-property');
		expect(untyped.properties[0].values[0].nested?.iconName).toBe('mentor-rdf-shape-property');
		expect(refined.properties[0].values[0].nested?.iconName).toBe('symbol-text');
	});

	it('does not link a labelled blank node, which has a row of its own', () => {
		const detail = detailOf('ex:Thing ex:related _:node .\n_:node ex:label "I stand alone" .\n');

		expect(detail.properties[0].values[0].nested).toBeUndefined();
	});

	it('positions the values of an inline blank node so they can be edited', () => {
		const detail = nestedDetailOf('ex:Thing ex:shape [ ex:name "inner" ] .\n');

		expect(detail.properties[0].values[0].position).toEqual({ line: PREAMBLE.split('\n').length - 1, character: 28 });
		expect(detail.properties[0].values[0].editable).toBe(true);
	});

	it('shows a collection as its items, in order', () => {
		const detail = detailOf('ex:Thing ex:steps ( ex:first ex:second ex:third ) .\n');

		expect(detail.properties[0].values[0].collection?.items.map(item => item.prefixedName)).toEqual(['ex:first', 'ex:second', 'ex:third']);
	});

	it('positions the items of a collection at their own tokens so they can be edited', () => {
		const detail = detailOf('ex:Thing ex:steps ( ex:first ex:second ) .\n');
		const items = detail.properties[0].values[0].collection?.items ?? [];
		const line = PREAMBLE.split('\n').length - 1;

		expect(items.map(item => item.position)).toEqual([{ line, character: 20 }, { line, character: 29 }]);
		expect(items.every(item => item.editable)).toBe(true);
	});

	it('hides the statements that chain a collection', () => {
		const detail = detailOf('ex:Thing ex:steps ( ex:first ex:second ) .\n');

		expect(detail.properties.map(property => property.predicate.term)).toEqual([{ kind: 'iri', iri: `${EX}steps` }]);
	});

	it('reads an empty collection as a list with no items', () => {
		const detail = detailOf('ex:Thing ex:steps () .\n');

		expect(detail.properties[0].values[0].collection?.items).toEqual([]);
	});

	it('carries the items of a collection of blank nodes', () => {
		// How SHACL writes alternatives: a list whose members are shapes.
		const detail = detailOf('ex:Shape sh:or ( [ sh:path ex:a ] [ sh:path ex:b ; sh:minCount 1 ] ) .\n');
		const items = detail.properties[0].values[0].collection?.items ?? [];

		expect(items).toHaveLength(2);
		expect(items.every(item => item.nested !== undefined)).toBe(true);
		expect(items[0].nested?.iconName).toBe('mentor-rdf-shape-property');
		expect(items[1].nested?.propertyCount).toBe(2);
	});
});

describe('ResourceViewBuilder value kinds', () => {
	it('tells the kind of values a predicate takes from the values it has', () => {
		const detail = detailOf('ex:Thing rdfs:label "First" ; ex:knows ex:Other , [ ex:p "x" ] ; ex:mixed "text" , ex:Other ; ex:steps ( ex:a ) .\n');
		const kinds = Object.fromEntries(detail.properties.map(property => [property.predicate.prefixedName, property.valueKind]));

		expect(kinds).toEqual({
			'rdfs:label': { kind: 'literal', source: 'usage' },
			'ex:knows': { kind: 'resource', source: 'usage' },
			'ex:mixed': { kind: 'any', source: 'usage' },
			'ex:steps': { kind: 'resource', source: 'usage' }
		});
	});
});

describe('ResourceViewBuilder resource marks', () => {
	it('marks IRI values with the glyph of the resource', () => {
		const detail = detailOf('ex:Thing ex:knows ex:Other ; ex:type ex:Kind ; ex:label "text" .\nex:Kind a owl:Class .\n', {}, {
			resolveObjectIcon: iri => iri === `${EX}Other` ? 'mentor-rdf-individual' : undefined
		});
		const [knows, type, label] = detail.properties;

		// Not described in the document: the resolver decides.
		expect(knows.values[0]).toMatchObject({ iconName: 'mentor-rdf-individual' });
		// Described in the document: its own type decides.
		expect(type.values[0]).toMatchObject({ iconName: 'mentor-rdf-class' });
		expect(label.values[0].iconName).toBeUndefined();
	});

	it('takes the glyph of a resource the document only mentions from the store', () => {
		const detail = detailOf('ex:A rdfs:subClassOf ex:B .\nex:B rdfs:label "B" .\n', {}, { resolveObjectIcon: () => 'mentor-rdf-class' });

		expect(detail.properties[0].values[0].iconName).toBe('mentor-rdf-class');
	});

	it('marks the IRI items of a collection', () => {
		const detail = detailOf('ex:Thing ex:steps ( ex:A "b" ) .\n', {}, { resolveObjectIcon: () => 'symbol-constant' });
		const items = detail.properties[0].values[0].collection!.items;

		expect(items[0].iconName).toBe('symbol-constant');
		expect(items[1].iconName).toBeUndefined();
	});
});

describe('ResourceViewBuilder.buildPredicateView', () => {
	it('names a predicate the document does not state as the predicates of the rows are named', () => {
		const documentContext = createResolvingDocumentContext({ namespaces: NAMESPACES, labels: { [RDFS.comment]: 'comment' } });
		const index = new ResourceIndexBuilder([], documentContext).build();

		expect(new ResourceViewBuilder(index, documentContext).buildPredicateView(RDFS.comment)).toEqual({
			term: { kind: 'iri', iri: RDFS.comment },
			label: 'comment',
			labelLanguage: undefined,
			prefixedName: 'rdfs:comment',
			editable: true
		});
	});
});

describe('ResourceViewBuilder comments', () => {
	it('carries the comments of a document to the things they were written about', () => {
		const detail = detailOf(`
			# The thing itself.
			# Written over two lines.
			ex:Thing a ex:Class ;
			         # what it is called
			         rdfs:label "First" , # a note on the line
			                    # about the second one
			                    "Second" .
		`);
		const [type, label] = detail.properties;

		// What introduces a resource stands outside its card, so the summary carries it, not the detail.
		expect(detail.comments).toBeUndefined();
		expect(type.comments).toBeUndefined();
		expect(label.comments).toEqual(['what it is called']);
		expect(label.values[0].comments).toBeUndefined();
		expect(label.values[1].comments).toEqual(['about the second one']);
	});

	it('gives a comment above a statement whose value is a blank node to that value, first or not', () => {
		const detail = detailOf(`
			ex:Shape a sh:NodeShape ;
			    # the first one
			    sh:property [ sh:path ex:a ] ;
			    # the second one
			    sh:property [ sh:path ex:b ] ;
			    # about the class
			    sh:class ex:Thing .
		`);
		const [, property, cls] = detail.properties;

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

		expect(nested.comments).toEqual(['what the node is for']);
	});
});
