import { describe, expect, it } from 'vitest';
import { RDF, RDFS } from '@faubulous/mentor-rdf';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { PredicateData, ResourceCardBodyData, TermData } from './resource-card-data';
import { getAssertedCardBody, splitInferredValues } from './inferred-statements';

const EX = 'http://example.org/';

/**
 * A value of a property.
 * @param iri The IRI of the value.
 * @param inferred Whether the reasoner infers it.
 * @returns The value.
 */
function value(iri: string, inferred = false): TermData {
	return { term: RdfDataFactory.namedNode(iri), editable: !inferred, ...(inferred ? { inferred } : {}) };
}

/**
 * A property of a card.
 * @param predicate The IRI of the predicate.
 * @param values The values.
 * @returns The property.
 */
function property(predicate: string, values: TermData[]): PredicateData {
	return { predicate: { term: RdfDataFactory.namedNode(predicate), editable: true }, values };
}

/**
 * The statements of a card of the thing.
 * @param predicates The properties.
 * @returns The statements.
 */
function cardBody(predicates: PredicateData[]): ResourceCardBodyData {
	return { subject: RdfDataFactory.namedNode(`${EX}Thing`), predicates };
}

describe('splitInferredValues', () => {
	it('keeps a property without inferred values as it is', () => {
		const types = property(RDF.type, [value(`${EX}Class`)]);

		expect(splitInferredValues(types)).toEqual({ asserted: types, inferred: [] });
	});

	it('splits the asserted values from the inferred ones', () => {
		const split = splitInferredValues(property(RDF.type, [value(`${EX}Class`), value(`${EX}Inferred`, true)]));

		expect(split.asserted?.values.map(item => item.term.value)).toEqual([`${EX}Class`]);
		expect(split.inferred.map(item => item.term.value)).toEqual([`${EX}Inferred`]);
	});

	it('gives the same asserted property every time a property is split', () => {
		const types = property(RDF.type, [value(`${EX}Class`), value(`${EX}Inferred`, true)]);

		expect(splitInferredValues(types).asserted).toBe(splitInferredValues(types).asserted);
	});

	it('has no asserted property where every value is inferred', () => {
		expect(splitInferredValues(property(RDF.type, [value(`${EX}Inferred`, true)])).asserted).toBeUndefined();
	});
});

describe('getAssertedCardBody', () => {
	it('returns statements without inferred values as they are', () => {
		const body = cardBody([property(RDF.type, [value(`${EX}Class`)])]);

		expect(getAssertedCardBody(body)).toBe(body);
	});

	it('leaves out the inferred values, and the properties with nothing else', () => {
		const body = cardBody([
			property(RDF.type, [value(`${EX}Class`), value(`${EX}Inferred`, true)]),
			property(RDFS.seeAlso, [value(`${EX}Other`, true)])
		]);

		expect(getAssertedCardBody(body).predicates.map(item => [item.predicate.term.value, item.values.map(entry => entry.term.value)])).toEqual([
			[RDF.type, [`${EX}Class`]]
		]);
	});
});
