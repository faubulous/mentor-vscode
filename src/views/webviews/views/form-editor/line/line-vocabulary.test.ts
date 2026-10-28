import { describe, expect, it } from 'vitest';
import { OWL, RDFS } from '@faubulous/mentor-rdf';
import { EXAMPLE_NAMESPACE, LINE_TEST_NAMESPACES, createTestLineVocabulary } from '@src/utilities/mocks/line-fixtures';
import { LineVocabulary } from './line-vocabulary';

describe('LineVocabulary', () => {
	const vocabulary = createTestLineVocabulary();

	it('finds a predicate by prefixed name, IRI reference or IRI', () => {
		expect(vocabulary.predicate('rdfs:label')).toMatchObject({ label: 'label', range: 'literal' });
		expect(vocabulary.predicate(`<${RDFS.label}>`)).toMatchObject({ curie: 'rdfs:label' });
		expect(vocabulary.predicate(RDFS.label)).toMatchObject({ curie: 'rdfs:label' });
	});

	it('maps the keyword a to rdf:type', () => {
		expect(vocabulary.predicate('a')).toMatchObject({ curie: 'rdf:type', label: 'type', range: 'resource' });
	});

	it('synthesises rdf:type when the entries lack it', () => {
		const bare = new LineVocabulary({ namespaces: LINE_TEST_NAMESPACES, predicates: [], resources: [] });

		expect(bare.predicate('a')).toMatchObject({ curie: 'rdf:type', label: 'type', range: 'resource' });
		expect(bare.predicate('rdf:type')).toBeDefined();
	});

	it('finds a resource by prefixed name, IRI reference or IRI', () => {
		expect(vocabulary.resource('owl:Class')).toMatchObject({ label: 'Class', kind: 'vocabularyTerm' });
		expect(vocabulary.resource(`<${OWL.Class}>`)).toMatchObject({ curie: 'owl:Class' });
		expect(vocabulary.resource(OWL.Class)).toMatchObject({ curie: 'owl:Class' });
		expect(vocabulary.resource('ex:Tree')).toMatchObject({ kind: 'documentResource' });
	});

	it('knows nothing about unknown terms', () => {
		expect(vocabulary.predicate('ex:custom')).toBeUndefined();
		expect(vocabulary.resource('ex:Nope')).toBeUndefined();
		expect(vocabulary.resource('foo:x')).toBeUndefined();
	});

	it('exposes a copy of the namespaces', () => {
		expect(vocabulary.namespaces.ex).toBe(EXAMPLE_NAMESPACE);
		expect(vocabulary.namespaces).not.toBe(LINE_TEST_NAMESPACES);
	});

	it('resolves IRI references and declared prefixed names', () => {
		expect(vocabulary.iriOf('<http://x/y>')).toBe('http://x/y');
		expect(vocabulary.iriOf('ex:Tree')).toBe(`${EXAMPLE_NAMESPACE}Tree`);
		expect(vocabulary.iriOf('foo:x')).toBeUndefined();
		expect(vocabulary.iriOf('word')).toBeUndefined();
	});
});
