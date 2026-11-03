import { describe, expect, it } from 'vitest';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { createLiteralView } from '@src/utilities/mocks/statement-fixtures';
import { LanguageFilter } from './language-filter';
import { RowValue } from './row-value';

/**
 * A written literal.
 */
function written(text: string, language?: string): RowValue {
	return { kind: 'written', view: createLiteralView(text, language) };
}

/**
 * A literal typed into the row.
 */
function typed(text: string, language?: string): RowValue {
	return { kind: 'term', term: RdfDataFactory.literal(text, language) };
}

describe('LanguageFilter', () => {
	const german = new LanguageFilter('de');

	it('shows the literals of its language, those without one and everything that is no literal', () => {
		expect(german.shows(RdfDataFactory.literal('Baum', 'de'))).toBe(true);
		expect(german.shows(RdfDataFactory.literal('Tree', 'en'))).toBe(false);
		expect(german.shows(RdfDataFactory.literal('42'))).toBe(true);
		expect(german.shows(RdfDataFactory.namedNode('http://example.org/a'))).toBe(true);
		expect(LanguageFilter.ALL.shows(RdfDataFactory.literal('Tree', 'en'))).toBe(true);
	});

	it('finds a row lacking its language only among rows whose literals carry language tags', () => {
		expect(german.lacksLanguage([written('Tree', 'en')])).toBe(true);
		expect(german.lacksLanguage([written('Tree', 'en'), written('Baum', 'de')])).toBe(false);
		expect(german.lacksLanguage([written('A plant')])).toBe(false);
		expect(german.lacksLanguage([])).toBe(false);
		expect(LanguageFilter.ALL.lacksLanguage([written('Tree', 'en')])).toBe(false);
	});

	it('takes the only new value of its language for the one typed into the empty field', () => {
		expect(german.filledIndex([written('Tree', 'en'), typed('Baum', 'de')])).toBe(1);
		expect(german.filledIndex([written('Tree', 'en'), written('Baum', 'de')])).toBeUndefined();
		expect(german.filledIndex([written('Tree', 'en'), typed('Baum', 'de'), typed('Eiche', 'de')])).toBeUndefined();
		expect(german.filledIndex([typed('Baum', 'de')])).toBeUndefined();
	});

	it('does not take a written value given another text for the one typed into the empty field', () => {
		const replaced: RowValue = { kind: 'term', term: RdfDataFactory.literal('Eiche', 'de'), replaces: createLiteralView('Baum', 'de') };

		expect(german.filledIndex([written('Tree', 'en'), replaced])).toBeUndefined();
	});
});
