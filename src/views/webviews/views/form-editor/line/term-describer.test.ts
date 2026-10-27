import { describe, expect, it } from 'vitest';
import { RDF } from '@faubulous/mentor-rdf';
import { EXAMPLE_NAMESPACE, createTestLineVocabulary } from '@src/utilities/mocks/line-fixtures';
import { LineLexer } from './line-lexer';
import { LineToken } from './line-token';
import { TermDescriber } from './term-describer';
import { LineValueKind } from './term-info';

const describer = new TermDescriber(createTestLineVocabulary());
const lexer = new LineLexer();

/**
 * Lex a single token.
 */
function token(text: string): LineToken {
	return lexer.tokenize(text)[0];
}

describe('TermDescriber.describePredicate', () => {
	it('describes known predicates, including a', () => {
		expect(describer.describePredicate(token('a'))).toMatchObject({ curie: 'rdf:type', label: 'type', range: 'res' });
		expect(describer.describePredicate(token('rdfs:label'))).toMatchObject({ label: 'label', range: 'lit' });
	});

	it('accepts a prefixed name with a declared prefix as a predicate of any range', () => {
		expect(describer.describePredicate(token('ex:custom'))).toEqual({ curie: 'ex:custom', iri: `${EXAMPLE_NAMESPACE}custom`, label: 'custom', range: 'any' });
	});

	it('accepts an IRI reference', () => {
		expect(describer.describePredicate(token('<http://x/y>'))).toEqual({ curie: '<http://x/y>', iri: 'http://x/y', label: 'y', range: 'any' });
	});

	it('reports what is not a predicate', () => {
		expect(describer.describePredicate(undefined)).toEqual({ error: 'A line starts with its predicate' });
		expect(describer.describePredicate(token('foo:x'))).toEqual({ error: 'Unknown prefix "foo:"' });
		expect(describer.describePredicate(token('label')).error).toMatch(/Unknown predicate/);
		expect(describer.describePredicate(token('"x"')).error).toBeDefined();
	});
});

describe('TermDescriber.rangeOf', () => {
	it('falls back to any for unknown predicates', () => {
		expect(describer.rangeOf(token('rdfs:label'))).toBe('lit');
		expect(describer.rangeOf(token('a'))).toBe('res');
		expect(describer.rangeOf(token('foo:x'))).toBe('any');
		expect(describer.rangeOf(undefined)).toBe('any');
	});
});

describe('TermDescriber.describeValue', () => {
	it('classifies literals, tags, numbers and placeholders', () => {
		expect(describer.describeValue(token('"x"'))).toEqual({ kind: 'lit' });
		expect(describer.describeValue(token('@en'))).toEqual({ kind: 'lang' });
		expect(describer.describeValue(token('42'))).toEqual({ kind: 'typed', datatype: 'xsd:integer' });
		expect(describer.describeValue(token('[…]'))).toEqual({ kind: 'hole' });
	});

	it('classifies resources by where they come from', () => {
		expect(describer.describeValue(token('owl:Class'))).toMatchObject({ kind: 'vocab', label: 'Class', curie: 'owl:Class' });
		expect(describer.describeValue(token('ex:Tree'))).toMatchObject({ kind: 'local', label: 'Tree' });
		expect(describer.describeValue(token('ex:Nope'))).toEqual({ kind: 'new', label: 'Nope', iri: `${EXAMPLE_NAMESPACE}Nope`, curie: 'ex:Nope' });
		expect(describer.describeValue(token('<http://x/y>'))).toEqual({ kind: 'ext', label: 'y', iri: 'http://x/y', curie: '<http://x/y>' });
		expect(describer.describeValue(token('<http://www.w3.org/2002/07/owl#Class>'))).toMatchObject({ kind: 'vocab' });
	});

	it('reports undeclared prefixes and bare words', () => {
		expect(describer.describeValue(token('foo:x'))).toEqual({ kind: 'err', error: 'Unknown prefix "foo:"' });
		expect(describer.describeValue(token('word')).kind).toBe('err');
	});
});

describe('TermDescriber.tokenIri', () => {
	it('resolves names and IRI references', () => {
		expect(describer.tokenIri(token('a'))).toBe(RDF.type);
		expect(describer.tokenIri(token('ex:Tree'))).toBe(`${EXAMPLE_NAMESPACE}Tree`);
		expect(describer.tokenIri(token('<http://x>'))).toBe('http://x');
		expect(describer.tokenIri(token('word'))).toBeUndefined();
		expect(describer.tokenIri(token('"x"'))).toBeUndefined();
	});
});

describe('resource and atomic tokens', () => {
	it('rings every kind of resource', () => {
		const resourceKinds: LineValueKind[] = ['vocab', 'local', 'new', 'ext'];
		const otherKinds: LineValueKind[] = ['lit', 'lang', 'typed', 'hole', 'err'];

		expect(resourceKinds.every(TermDescriber.isResourceKind)).toBe(true);
		expect(otherKinds.some(TermDescriber.isResourceKind)).toBe(false);
	});

	it('tells resource tokens from the rest', () => {
		expect(describer.isResourceToken(token('owl:Class'))).toBe(true);
		expect(describer.isResourceToken(token('ex:Nope'))).toBe(true);
		expect(describer.isResourceToken(token('"x"'))).toBe(false);
		expect(describer.isResourceToken(token('42'))).toBe(false);
	});

	it('treats valid predicates, resources and placeholders as atomic', () => {
		const items = lexer.items(lexer.tokenize('a owl:Class "x" […] foo'));

		expect(items.map((_, index) => describer.isAtomicToken(items, index))).toEqual([true, true, false, true, false]);
		expect(describer.isAtomicToken(lexer.items(lexer.tokenize('foo:x owl:Class')), 0)).toBe(false);
	});
});

describe('TermDescriber.isLabelPredicate', () => {
	it('recognises the label predicates by IRI', () => {
		expect(describer.isLabelPredicate(token('rdfs:label'))).toBe(true);
		expect(describer.isLabelPredicate(token('skos:prefLabel'))).toBe(true);
		expect(describer.isLabelPredicate(token('dcterms:title'))).toBe(true);
		expect(describer.isLabelPredicate(token('rdfs:comment'))).toBe(false);
		expect(describer.isLabelPredicate(undefined)).toBe(false);
	});
});

describe('TermDescriber.ghostFor', () => {
	it('hints at the kind of value a range takes', () => {
		expect(TermDescriber.ghostFor('lit')).toBe('"text"@en');
		expect(TermDescriber.ghostFor('res')).toBe('resource');
		expect(TermDescriber.ghostFor('any')).toBe('value');
	});
});

describe('TermDescriber.pillDisplayOf', () => {
	it('labels vocabulary and local resources by their entry', () => {
		expect(describer.pillDisplayOf('owl:Class')).toMatchObject({ label: 'Class', kind: 'vocab' });
		expect(describer.pillDisplayOf('ex:Tree')).toMatchObject({ label: 'Tree', kind: 'local' });
	});

	it('labels a term the row knows by its view, with the icon of the definition tree', () => {
		const terms = { 'ex:Other': { term: { kind: 'iri' as const, iri: `${EXAMPLE_NAMESPACE}Other` }, label: 'Other thing', iconName: 'mentor-rdf-class', editable: true } };

		expect(describer.pillDisplayOf('ex:Other', terms)).toMatchObject({ label: 'Other thing', kind: 'ext', iconName: 'mentor-rdf-class' });
	});

	it('marks a declared but unknown name as new and an undeclared one as an error', () => {
		expect(describer.pillDisplayOf('ex:Unknown').kind).toBe('new');
		expect(describer.pillDisplayOf('nope:X').kind).toBe('err');
	});
});

describe('TermDescriber.predicateLabelOf', () => {
	it('labels predicates from the vocabulary, a as type, and others by their local name', () => {
		expect(describer.predicateLabelOf('rdfs:label')).toBe('label');
		expect(describer.predicateLabelOf('a')).toBe('type');
		expect(describer.predicateLabelOf('ex:hasPart')).toBe('has part');
		expect(describer.predicateLabelOf('nope:x')).toBe('nope:x');
	});
});
