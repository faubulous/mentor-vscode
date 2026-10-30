import { describe, expect, it } from 'vitest';
import { RDFS, SKOS } from '@faubulous/mentor-rdf';
import { QuadContext } from '@faubulous/mentor-rdf-parsers';
import { AnnotationResolver } from './annotation-resolver';
import { ResourceIndexEntry } from './resource-index';

/**
 * Build an index entry stating the given literals.
 */
function entryOf(name: string, statements: [string, string, string?][]): ResourceIndexEntry {
	const quads = statements.map(([predicate, value, language]) => ({
		predicate: { termType: 'NamedNode', value: predicate },
		object: { termType: 'Literal', value, language: language ?? '' }
	})) as unknown as QuadContext[];

	return { id: `i:${name}`, term: { kind: 'iri', iri: name }, quads, nested: false };
}

describe('AnnotationResolver.findLabel', () => {
	it('takes the first predicate the resource states a literal for', () => {
		const entry = entryOf('A', [[RDFS.comment, 'a comment'], [RDFS.label, 'A label']]);

		expect(new AnnotationResolver([SKOS.prefLabel, RDFS.label], []).findLabel(entry)).toEqual({ predicate: RDFS.label, text: 'A label', language: undefined });
	});

	it('prefers the active language, then a regional variant of it, then the first value', () => {
		const entry = entryOf('A', [[RDFS.label, 'Name', 'en'], [RDFS.label, 'Name (GB)', 'en-GB'], [RDFS.label, 'Name', 'de']]);
		const labelIn = (language: string) => new AnnotationResolver([RDFS.label], [], language).findLabel(entry);

		expect(labelIn('en-GB')?.text).toBe('Name (GB)');
		expect(labelIn('de')?.text).toBe('Name');
		expect(labelIn('en-US')?.language).toBe('en');
		expect(labelIn('fr')?.language).toBe('en');
	});

	it('finds nothing for a resource that states none of the predicates', () => {
		expect(new AnnotationResolver([RDFS.label], []).findLabel(entryOf('A', [[RDFS.comment, 'x']]))).toBeUndefined();
	});
});

describe('AnnotationResolver.findDescription', () => {
	it('reads the description predicates', () => {
		const entry = entryOf('A', [[RDFS.comment, 'a comment'], [SKOS.definition, 'a definition']]);

		expect(new AnnotationResolver([], [SKOS.definition, RDFS.comment]).findDescription(entry)?.text).toBe('a definition');
	});
});
