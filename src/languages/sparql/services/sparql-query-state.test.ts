import { describe, it, expect } from 'vitest';
import { getDisplayName } from './sparql-query-state';

function makeState(documentIri: string, notebookIri?: string, cellIndex?: number): any {
	return {
		id: 'test-id',
		documentIri,
		notebookIri,
		cellIndex,
		startTime: Date.now(),
	};
}

describe('getDisplayName', () => {
	it('returns just the file name for a plain document', () => {
		const state = makeState('file:///workspace/queries/my-query.sparql');

		expect(getDisplayName(state)).toBe('my-query.sparql');
	});

	it('returns a cell label when both notebookIri and cellIndex are set', () => {
		const state = makeState(
			'file:///workspace/notebook.sparqlbook#Cell-2',
			'file:///workspace/notebook.sparqlbook',
			2,
		);

		expect(getDisplayName(state)).toBe('notebook.sparqlbook:Cell-2');
	});

	it('strips fragment from filename in the notebook cell label', () => {
		// documentIri may include a fragment for the cell — only the base filename matters
		const state = makeState(
			'file:///workspace/nb.sparqlbook#cellId',
			'file:///workspace/nb.sparqlbook',
			0,
		);

		expect(getDisplayName(state)).toBe('nb.sparqlbook:Cell-0');
	});

	it('returns the document file name when notebookIri is set but cellIndex is undefined', () => {
		const state = makeState(
			'file:///workspace/queries/query.sparql',
			'file:///workspace/notebook.sparqlbook',
			undefined,
		);

		// cellIndex is undefined, so the notebook branch is not taken
		expect(getDisplayName(state)).toBe('query.sparql');
	});

	it('returns the document file name when cellIndex is set but notebookIri is absent', () => {
		const state = makeState('file:///workspace/queries/query.sparql', undefined, 1);

		expect(getDisplayName(state)).toBe('query.sparql');
	});

	it('works for a URI without slashes', () => {
		const state = makeState('myquery.sparql');
		
		expect(getDisplayName(state)).toBe('myquery.sparql');
	});
});
