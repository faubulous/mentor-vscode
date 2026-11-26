import { describe, expect, it } from 'vitest';
import { RDF, RDFS, SKOS } from '@faubulous/mentor-rdf';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { PredicateData, ResourceCardData, ResourceCardHeaderData, TermData } from './resource-card-data';
import { ResourceTooltipMarkdown, ResourceTooltipOptions } from './resource-tooltip-markdown';

const EX = 'http://example.org/';

const OPTIONS: ResourceTooltipOptions = { labelPredicates: [RDFS.label, SKOS.prefLabel], descriptionPredicates: [RDFS.comment, SKOS.definition], language: 'en' };

/**
 * The data of a term as a card shows it.
 * @param term The term.
 * @param overrides Other fields of the data.
 * @returns The data.
 */
function termData(term: TermData['term'], overrides: Partial<TermData> = {}): TermData {
	return { term, editable: false, ...overrides };
}

/**
 * A property of a card body.
 * @param predicate The IRI of the predicate.
 * @param label The label of the predicate.
 * @param values The values.
 * @returns The property.
 */
function property(predicate: string, label: string, values: TermData[]): PredicateData {
	return { predicate: termData(RdfDataFactory.namedNode(predicate), { label }), values };
}

/**
 * The card of the oak, with the given header fields and properties.
 * @param header Fields of the header.
 * @param predicates The properties of the body.
 * @returns The card.
 */
function card(header: Partial<ResourceCardHeaderData> = {}, predicates: PredicateData[] = []): ResourceCardData {
	const subject = RdfDataFactory.namedNode(`${EX}Oak`);

	return {
		cardHeader: { subject, label: 'Oak', hasLabel: true, iconName: 'mentor-rdf-individual', typeLabels: ['Tree'], usageCount: 3, ...header },
		cardBody: { subject, predicates }
	};
}

describe('ResourceTooltipMarkdown', () => {
	const markdown = new ResourceTooltipMarkdown(OPTIONS);

	it('shows the types and the usage count above the label, the description, and the IRI below a rule', () => {
		expect(markdown.render(card({ typeLabels: ['Tree', 'Plant'], description: 'A tree of the genus Quercus.' }))).toBe(
			'_Tree, Plant · 3 usages_\n\n---\n\n**Oak**\n\nA tree of the genus Quercus\\.\n\n---\n\n`http://example.org/Oak`'
		);
	});

	it('shows the pinned properties of the types as lines of their names and values, with the description in document order', () => {
		const predicates = [
			property(RDFS.label, 'label', [termData(RdfDataFactory.literal('Oak', 'en'))]),
			property(`${EX}broader`, 'broader', [termData(RdfDataFactory.namedNode(`${EX}Tree`), { label: 'Tree' }), termData(RdfDataFactory.namedNode(`${EX}Plant`), { prefixedName: 'ex:Plant' })]),
			property(RDFS.comment, 'comment', [termData(RdfDataFactory.literal('Eine Eiche.', 'de')), termData(RdfDataFactory.literal('An oak.', 'en'))]),
			property(`${EX}height`, 'height', [termData(RdfDataFactory.literal('30'))]),
			property(`${EX}unpinned`, 'unpinned', [termData(RdfDataFactory.literal('x'))])
		];
		const pins = [RDFS.label, `${EX}broader`, `${EX}height`].map(iri => ({ predicate: RdfDataFactory.namedNode(iri), scope: 'workspace' as const }));

		expect(markdown.render(card({ pins }, predicates))).toBe(
			'_Tree · 3 usages_\n\n---\n\n**Oak**\n\nbroader: Tree, ex:Plant\n\nAn oak\\.\n\nheight: 30\n\n---\n\n`http://example.org/Oak`'
		);
	});

	it('names a list by its items and a blank node by its label and properties', () => {
		const list = termData(RdfDataFactory.blankNode('l'), { collection: { items: [termData(RdfDataFactory.namedNode(`${EX}a`), { label: 'A' }), termData(RdfDataFactory.literal('b'))] } });
		const node = termData(RdfDataFactory.blankNode('n'), { nested: { term: RdfDataFactory.blankNode('n'), propertyCount: 1, typeLabel: 'Leaf' } });
		const pins = [{ predicate: RdfDataFactory.namedNode(`${EX}parts`), scope: 'user' as const }];

		expect(markdown.render(card({ pins }, [property(`${EX}parts`, 'parts', [list, node])]))).toContain('parts: \\(A, b\\), \\[ Leaf · 1 property \\]');
	});

	it('escapes the text of the store and writes the identifier of a blank node', () => {
		const subject = RdfDataFactory.blankNode('b0');

		expect(markdown.render({ cardHeader: { subject, label: '*bold* [link](x)', hasLabel: true, iconName: '', usageCount: 1 }, cardBody: { subject, predicates: [] } })).toBe(
			'_1 usage_\n\n---\n\n**\\*bold\\* \\[link\\]\\(x\\)**\n\n---\n\n`_:b0`'
		);
	});

	it('shows the label and the identifier of a resource the store does not know', () => {
		expect(markdown.renderUnknown(RdfDataFactory.namedNode(`${EX}Unknown`), 'Unknown')).toBe('**Unknown**\n\n---\n\n`http://example.org/Unknown`');
	});

	it('links the types, the captions, the resources and the IRI to their definitions, and no literal', () => {
		const linked = new ResourceTooltipMarkdown({ ...OPTIONS, linkOf: resource => `go:${resource.value}` });
		const predicates = [
			property(RDF.type, 'type', [termData(RdfDataFactory.namedNode(`${EX}Tree`), { label: 'Tree' })]),
			property(`${EX}broader`, 'broader', [termData(RdfDataFactory.namedNode(`${EX}Tree`), { label: 'Tree' })]),
			property(`${EX}height`, 'height', [termData(RdfDataFactory.literal('30'))])
		];
		const pins = [`${EX}broader`, `${EX}height`].map(iri => ({ predicate: RdfDataFactory.namedNode(iri), scope: 'workspace' as const }));

		expect(linked.render(card({ pins }, predicates))).toBe(
			'_[Tree](go:http://example.org/Tree) · 3 usages_\n\n---\n\n**Oak**\n\n' +
			'[broader](go:http://example.org/broader): [Tree](go:http://example.org/Tree)  \n[height](go:http://example.org/height): 30\n\n---\n\n' +
			'[http://example\\.org/Oak](go:http://example.org/Oak)'
		);
	});

	it('shows the statements asserted only, not those the reasoner inferred', () => {
		const predicates = [
			property(`${EX}broader`, 'broader', [termData(RdfDataFactory.namedNode(`${EX}Tree`), { label: 'Tree' }), termData(RdfDataFactory.namedNode(`${EX}Plant`), { label: 'Plant', inferred: true })]),
			property(`${EX}height`, 'height', [termData(RdfDataFactory.literal('30'), { inferred: true })])
		];
		const pins = [`${EX}broader`, `${EX}height`].map(iri => ({ predicate: RdfDataFactory.namedNode(iri), scope: 'workspace' as const }));

		expect(markdown.render(card({ pins, inferredTypeLabels: ['Named individual'] }, predicates))).toBe(
			'_Tree · 3 usages_\n\n---\n\n**Oak**\n\nbroader: Tree\n\n---\n\n`http://example.org/Oak`'
		);
	});

	it('links a blank node by its identifier', () => {
		const linked = new ResourceTooltipMarkdown({ ...OPTIONS, linkOf: resource => `go:${resource.value}` });

		expect(linked.renderUnknown(RdfDataFactory.blankNode('b0'), 'b0')).toBe('**b0**\n\n---\n\n[\\_:b0](go:b0)');
	});
});
