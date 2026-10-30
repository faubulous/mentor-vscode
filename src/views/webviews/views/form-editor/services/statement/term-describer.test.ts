import { describe, expect, it } from 'vitest';
import { RDF } from '@faubulous/mentor-rdf';
import { EXAMPLE_NAMESPACE, createTestStatementVocabulary } from '@src/utilities/mocks/statement-vocabulary-fixtures';
import { StatementLexer } from './statement-lexer';
import { StatementToken } from './statement-token';
import { TermDescriber } from './term-describer';
import { StatementValueKind } from './term-info';

const describer = new TermDescriber(createTestStatementVocabulary());
const lexer = new StatementLexer();

/**
 * Lex a single token.
 */
function token(text: string): StatementToken {
	return lexer.tokenize(text)[0];
}

describe('TermDescriber.describePredicate', () => {
	it('describes known predicates, including a', () => {
		expect(describer.describePredicate(token('a'))).toMatchObject({ curie: 'rdf:type', label: 'type', range: 'resource' });
		expect(describer.describePredicate(token('rdfs:label'))).toMatchObject({ label: 'label', range: 'literal' });
	});

	it('accepts a prefixed name with a declared prefix as a predicate of any range', () => {
		expect(describer.describePredicate(token('ex:custom'))).toEqual({ curie: 'ex:custom', iri: `${EXAMPLE_NAMESPACE}custom`, label: 'custom', range: 'any' });
	});

	it('accepts an IRI reference', () => {
		expect(describer.describePredicate(token('<http://x/y>'))).toEqual({ curie: '<http://x/y>', iri: 'http://x/y', label: 'y', range: 'any' });
	});

	it('reports what is not a predicate', () => {
		expect(describer.describePredicate(undefined)).toEqual({ error: 'A statement starts with its predicate' });
		expect(describer.describePredicate(token('foo:x'))).toEqual({ error: 'Unknown prefix "foo:"' });
		expect(describer.describePredicate(token('label')).error).toMatch(/Unknown predicate/);
		expect(describer.describePredicate(token('"x"')).error).toBeDefined();
	});
});

describe('TermDescriber.rangeOf', () => {
	it('falls back to any for unknown predicates', () => {
		expect(describer.rangeOf(token('rdfs:label'))).toBe('literal');
		expect(describer.rangeOf(token('a'))).toBe('resource');
		expect(describer.rangeOf(token('foo:x'))).toBe('any');
		expect(describer.rangeOf(undefined)).toBe('any');
	});
});

describe('TermDescriber.describeValue', () => {
	it('classifies literals, tags, numbers and nested-node markers', () => {
		expect(describer.describeValue(token('"x"'))).toEqual({ kind: 'literal' });
		expect(describer.describeValue(token('@en'))).toEqual({ kind: 'languageTag' });
		expect(describer.describeValue(token('42'))).toEqual({ kind: 'shorthandLiteral', datatype: 'xsd:integer' });
		expect(describer.describeValue(token('[]'))).toEqual({ kind: 'nestedNode' });
	});

	it('classifies resources by where they come from', () => {
		expect(describer.describeValue(token('owl:Class'))).toMatchObject({ kind: 'vocabularyTerm', label: 'Class', curie: 'owl:Class' });
		expect(describer.describeValue(token('ex:Tree'))).toMatchObject({ kind: 'documentResource', label: 'Tree' });
		expect(describer.describeValue(token('ex:Nope'))).toEqual({ kind: 'newResource', label: 'Nope', iri: `${EXAMPLE_NAMESPACE}Nope`, curie: 'ex:Nope' });
		expect(describer.describeValue(token('<http://x/y>'))).toEqual({ kind: 'externalResource', label: 'y', iri: 'http://x/y', curie: '<http://x/y>' });
		expect(describer.describeValue(token('<http://www.w3.org/2002/07/owl#Class>'))).toMatchObject({ kind: 'vocabularyTerm' });
	});

	it('reports undeclared prefixes and bare words', () => {
		expect(describer.describeValue(token('foo:x'))).toEqual({ kind: 'error', error: 'Unknown prefix "foo:"' });
		expect(describer.describeValue(token('word')).kind).toBe('error');
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
		const resourceKinds: StatementValueKind[] = ['vocabularyTerm', 'documentResource', 'newResource', 'externalResource'];
		const otherKinds: StatementValueKind[] = ['literal', 'languageTag', 'shorthandLiteral', 'nestedNode', 'error'];

		expect(resourceKinds.every(TermDescriber.isResourceKind)).toBe(true);
		expect(otherKinds.some(TermDescriber.isResourceKind)).toBe(false);
	});

	it('tells resource tokens from the rest', () => {
		expect(describer.isResourceToken(token('owl:Class'))).toBe(true);
		expect(describer.isResourceToken(token('ex:Nope'))).toBe(true);
		expect(describer.isResourceToken(token('"x"'))).toBe(false);
		expect(describer.isResourceToken(token('42'))).toBe(false);
	});

	it('treats valid predicates, resources and nested-node markers as atomic', () => {
		const items = lexer.items(lexer.tokenize('a owl:Class "x" [] foo'));

		expect(items.map((_, index) => describer.isAtomicToken(items, index))).toEqual([true, true, false, true, false]);
		expect(describer.isAtomicToken(lexer.items(lexer.tokenize('foo:x owl:Class')), 0)).toBe(false);
	});
});

describe('TermDescriber.ghostFor', () => {
	it('hints at the kind of value a range takes', () => {
		expect(TermDescriber.ghostFor('literal')).toBe('"text"@en');
		expect(TermDescriber.ghostFor('resource')).toBe('resource');
		expect(TermDescriber.ghostFor('any')).toBe('value');
	});
});

describe('TermDescriber.pillDisplayOf', () => {
	it('labels vocabulary and local resources by their entry', () => {
		expect(describer.pillDisplayOf('owl:Class')).toMatchObject({ label: 'Class', kind: 'vocabularyTerm' });
		expect(describer.pillDisplayOf('ex:Tree')).toMatchObject({ label: 'Tree', kind: 'documentResource' });
	});

	it('labels a term the row knows by its view, with the icon of the definition tree', () => {
		const terms = { 'ex:Other': { term: { kind: 'iri' as const, iri: `${EXAMPLE_NAMESPACE}Other` }, label: 'Other thing', iconName: 'mentor-rdf-class', editable: true } };

		expect(describer.pillDisplayOf('ex:Other', terms)).toMatchObject({ label: 'Other thing', kind: 'externalResource', iconName: 'mentor-rdf-class' });
	});

	it('marks a declared but unknown name as new and an undeclared one as an error', () => {
		expect(describer.pillDisplayOf('ex:Unknown').kind).toBe('newResource');
		expect(describer.pillDisplayOf('nope:X').kind).toBe('error');
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
