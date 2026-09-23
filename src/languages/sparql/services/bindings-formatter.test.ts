import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { formatQueryResult, getLanguageIdForFormat, getTermText } from './bindings-formatter';
import { BindingsResult } from './sparql-query-state';

const FOAF = 'http://xmlns.com/foaf/0.1/';

/**
 * Returns a bindings result with the given columns and rows, using a FOAF prefix mapping.
 */
function givenBindings(columns: string[], rows: Record<string, any>[]): BindingsResult {
	return { type: 'bindings', columns, rows, namespaceMap: { [FOAF]: 'foaf' } } as BindingsResult;
}

const literal = (value: string) => ({ termType: 'Literal', value }) as any;
const namedNode = (value: string) => ({ termType: 'NamedNode', value }) as any;

describe('getTermText', () => {
	it('should return an empty string for an unbound term', () => {
		expect(getTermText(undefined)).toBe('');
	});

	it('should return the full IRI by default', () => {
		expect(getTermText(namedNode(`${FOAF}Person`), { [FOAF]: 'foaf' })).toBe(`${FOAF}Person`);
	});

	it('should abbreviate a named node when the prefixed form is requested', () => {
		expect(getTermText(namedNode(`${FOAF}Person`), { [FOAF]: 'foaf' }, 'prefixed')).toBe('foaf:Person');
	});

	it('should fall back to the full IRI when no prefix is known', () => {
		expect(getTermText(namedNode('http://example.org/s'), { [FOAF]: 'foaf' }, 'prefixed')).toBe('http://example.org/s');
	});

	it('should render a blank node with its label', () => {
		expect(getTermText({ termType: 'BlankNode', value: 'b0' } as any)).toBe('_:b0');
	});

	it('should render a literal as its bare value without language or datatype', () => {
		const term = { termType: 'Literal', value: 'Alice', language: 'en', datatype: { value: 'http://example.org/dt' } } as any;

		expect(getTermText(term)).toBe('Alice');
	});
});

describe('formatQueryResult - csv', () => {
	it('should quote every field and separate them with commas', () => {
		const result = givenBindings(['s', 'label'], [{ s: namedNode('http://example.org/s'), label: literal('Alice') }]);

		expect(formatQueryResult(result, { format: 'csv' }))
			.toBe('"s","label"\n"http://example.org/s","Alice"');
	});

	it('should escape double quotes by doubling them', () => {
		const result = givenBindings(['label'], [{ label: literal('a "quoted" word') }]);

		expect(formatQueryResult(result, { format: 'csv' })).toBe('"label"\n"a ""quoted"" word"');
	});

	it('should preserve a comma inside a quoted field', () => {
		const result = givenBindings(['label'], [{ label: literal('Doe, Jane') }]);

		expect(formatQueryResult(result, { format: 'csv' })).toBe('"label"\n"Doe, Jane"');
	});

	it('should preserve a newline inside a quoted field', () => {
		const result = givenBindings(['label'], [{ label: literal('first\nsecond') }]);

		expect(formatQueryResult(result, { format: 'csv' })).toBe('"label"\n"first\nsecond"');
	});

	it('should write an empty field for an unbound variable', () => {
		const result = givenBindings(['s', 'label'], [{ s: namedNode('http://example.org/s') }]);

		expect(formatQueryResult(result, { format: 'csv' })).toBe('"s","label"\n"http://example.org/s",""');
	});
});

describe('formatQueryResult - markdown', () => {
	it('should render a table with a separator row', () => {
		const result = givenBindings(['s', 'label'], [{ s: namedNode('http://example.org/s'), label: literal('Alice') }]);

		expect(formatQueryResult(result, { format: 'markdown' }))
			.toBe('| s | label |\n| --- | --- |\n| http://example.org/s | Alice |');
	});

	it('should escape a pipe so it does not end the cell', () => {
		const result = givenBindings(['label'], [{ label: literal('a | b') }]);

		expect(formatQueryResult(result, { format: 'markdown' })).toContain('| a \\| b |');
	});

	it('should escape a backslash so it cannot escape the escape character', () => {
		const result = givenBindings(['label'], [{ label: literal('C:\\temp') }]);

		expect(formatQueryResult(result, { format: 'markdown' })).toContain('| C:\\\\temp |');
	});

	it('should keep a pipe escaped when the value already ends with a backslash', () => {
		// Without escaping the backslash first this yields '\\|', which renders as a literal
		// backslash followed by a bare pipe and so ends the cell.
		const result = givenBindings(['label'], [{ label: literal('a\\|b') }]);

		expect(formatQueryResult(result, { format: 'markdown' })).toContain('| a\\\\\\|b |');
	});

	it('should replace newlines so they do not end the row', () => {
		const result = givenBindings(['label'], [{ label: literal('first\nsecond') }]);

		expect(formatQueryResult(result, { format: 'markdown' })).toContain('| first<br>second |');
	});

	it('should use prefixed IRIs when requested', () => {
		const result = givenBindings(['s'], [{ s: namedNode(`${FOAF}Person`) }]);

		expect(formatQueryResult(result, { format: 'markdown', iriForm: 'prefixed' })).toContain('| foaf:Person |');
	});

	it('should leave an unbound variable as an empty cell', () => {
		const result = givenBindings(['s', 'label'], [{ s: namedNode('http://example.org/s') }]);

		expect(formatQueryResult(result, { format: 'markdown' })).toContain('| http://example.org/s |  |');
	});
});

describe('formatQueryResult - json', () => {
	it('should render the SPARQL Query Results JSON shape', () => {
		const result = givenBindings(['s', 'label'], [{ s: namedNode('http://example.org/s'), label: literal('Alice') }]);

		expect(JSON.parse(formatQueryResult(result, { format: 'json' }))).toEqual({
			head: { vars: ['s', 'label'] },
			results: {
				bindings: [{
					s: { type: 'uri', value: 'http://example.org/s' },
					label: { type: 'literal', value: 'Alice' }
				}]
			}
		});
	});

	it('should omit unbound variables from a binding', () => {
		const result = givenBindings(['s', 'label'], [{ s: namedNode('http://example.org/s') }]);
		const parsed = JSON.parse(formatQueryResult(result, { format: 'json' }));

		expect(parsed.results.bindings[0]).not.toHaveProperty('label');
	});

	it('should keep the language tag and datatype of a literal', () => {
		const tagged = { termType: 'Literal', value: 'Alice', language: 'en' } as any;
		const typed = { termType: 'Literal', value: '42', datatype: { value: 'http://www.w3.org/2001/XMLSchema#integer' } } as any;
		const parsed = JSON.parse(formatQueryResult(givenBindings(['a', 'b'], [{ a: tagged, b: typed }]), { format: 'json' }));

		expect(parsed.results.bindings[0].a['xml:lang']).toBe('en');
		expect(parsed.results.bindings[0].b.datatype).toBe('http://www.w3.org/2001/XMLSchema#integer');
	});
});

describe('formatQueryResult - boolean and empty results', () => {
	it('should return an empty string when there is no result', () => {
		expect(formatQueryResult(undefined, { format: 'csv' })).toBe('');
	});

	it('should render a boolean result as its value in text formats', () => {
		expect(formatQueryResult({ type: 'boolean', value: true } as any, { format: 'markdown' })).toBe('true');
	});

	it('should render a boolean result in the JSON results shape', () => {
		expect(JSON.parse(formatQueryResult({ type: 'boolean', value: false } as any, { format: 'json' })))
			.toEqual({ head: {}, boolean: false });
	});

	it('should render a header row for a result without rows', () => {
		expect(formatQueryResult(givenBindings(['s'], []), { format: 'markdown' })).toBe('| s |\n| --- |');
	});
});

describe('getLanguageIdForFormat', () => {
	it('should map every format to its document language', () => {
		expect(getLanguageIdForFormat('csv')).toBe('csv');
		expect(getLanguageIdForFormat('markdown')).toBe('markdown');
		expect(getLanguageIdForFormat('json')).toBe('json');
	});
});
