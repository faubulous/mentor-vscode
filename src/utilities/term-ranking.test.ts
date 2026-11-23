import { describe, expect, it } from 'vitest';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { ResourceOptionData, TermFit, TermSource } from '@src/services/vocabulary/term-search';
import { rankTermOptions } from './term-ranking';

/**
 * An option for a term of the example namespace.
 * @param name The local name, which is its label too.
 * @param source Where the term comes from.
 * @param fit How the term fits the statement, if anything tells.
 * @returns The option.
 */
function option(name: string, source: TermSource, fit?: TermFit): ResourceOptionData {
	return { subject: RdfDataFactory.namedNode(`http://example.org/${name}`), label: name, source, fit };
}

/**
 * The labels of options, in order.
 * @param options The options.
 * @returns The labels.
 */
function labelsOf(options: readonly ResourceOptionData[]): string[] {
	return options.map(entry => entry.label);
}

describe('rankTermOptions', () => {
	it('ranks predicates by how they fit the resource, then alphabetically, wherever they come from', () => {
		const options = [
			option('zone', 'document', 'other'),
			option('label', 'document', 'general'),
			option('height', 'workspace', 'fits'),
			option('age', 'workspace', 'fits'),
			option('comment', 'workspace', 'general')
		];

		expect(labelsOf(rankTermOptions(options, '', 'predicate'))).toEqual(['age', 'height', 'comment', 'label', 'zone']);
	});

	it('ranks a predicate whose name starts with the text before one that only contains it, within a fit', () => {
		const options = [option('treeLabel', 'workspace', 'fits'), option('label', 'workspace', 'fits'), option('labelled', 'workspace', 'other')];

		expect(labelsOf(rankTermOptions(options, 'lab', 'predicate'))).toEqual(['label', 'treeLabel', 'labelled']);
	});

	it('ranks values by their fit, then by where they come from', () => {
		const options = [option('Alice', 'document', 'other'), option('Elm', 'workspace', 'fits'), option('Oak', 'document', 'fits'), option('Thing', 'document')];

		expect(labelsOf(rankTermOptions(options, '', 'resource'))).toEqual(['Oak', 'Elm', 'Thing', 'Alice']);
	});
});
