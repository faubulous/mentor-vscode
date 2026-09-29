import { describe, it, expect } from 'vitest';

import { getGraphVariables } from './graph-variables';

describe('getGraphVariables', () => {
	it('should return no variables when the query is unknown', () => {
		expect(getGraphVariables(undefined)).toEqual(new Set());
	});

	it('should return no variables for a query without a graph clause', () => {
		expect(getGraphVariables('SELECT * WHERE { ?s ?p ?o }')).toEqual(new Set());
	});

	it('should return the variable of a graph clause without its question mark', () => {
		expect(getGraphVariables('SELECT * WHERE { GRAPH ?g { ?s ?p ?o } }')).toEqual(new Set(['g']));
	});

	it('should return the variables of every graph clause, not only the first', () => {
		const query = 'SELECT * WHERE { GRAPH ?first { ?s ?p ?o } GRAPH ?second { ?a ?b ?c } }';

		expect(getGraphVariables(query)).toEqual(new Set(['first', 'second']));
	});

	it('should not return the matched clause itself', () => {
		expect(getGraphVariables('SELECT * WHERE { GRAPH ?g { ?s ?p ?o } }')).not.toContain('GRAPH ?g');
	});

	it('should match the keyword regardless of its case', () => {
		expect(getGraphVariables('select * where { graph ?g { ?s ?p ?o } }')).toEqual(new Set(['g']));
	});

	it('should allow any whitespace between the keyword and the variable', () => {
		expect(getGraphVariables('SELECT * WHERE {\n\tGRAPH\n\t?g { ?s ?p ?o } }')).toEqual(new Set(['g']));
	});

	it('should report a variable bound by several graph clauses once', () => {
		const query = 'SELECT * WHERE { GRAPH ?g { ?s ?p ?o } GRAPH ?g { ?a ?b ?c } }';

		expect(getGraphVariables(query)).toEqual(new Set(['g']));
	});

	it('should ignore a graph clause naming an IRI instead of a variable', () => {
		expect(getGraphVariables('SELECT * WHERE { GRAPH <http://example.org/g> { ?s ?p ?o } }')).toEqual(new Set());
	});
});
