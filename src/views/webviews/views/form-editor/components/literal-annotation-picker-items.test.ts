import { describe, expect, it } from 'vitest';
import { XSD } from '@faubulous/mentor-rdf/ontologies';
import { RDF } from '@faubulous/mentor-rdf';
import { createTermOption } from '@src/utilities/mocks/term-search-fixtures';
import { filterLiteralAnnotationPickerItems, getDatatypeItems, getLanguageItems, getLiteralAnnotationItemKey } from './literal-annotation-picker-items';

const GEO = 'http://www.opengis.net/ont/geosparql#';

describe('literal annotation picker items', () => {
	it('offers the datatypes the fields know by their names and formats, then those of the workspace by their prefixed names', () => {
		const wktLiteral = createTermOption(`${GEO}wktLiteral`, 'wkt literal', { prefixedName: 'geo:wktLiteral', missingPrefix: { prefix: 'geo', namespace: GEO } });
		const items = getDatatypeItems([createTermOption(XSD.date, 'date'), createTermOption(RDF.langString, 'lang string'), wktLiteral]);

		expect(items.map(item => [item.code, item.description])).toEqual([
			['string', 'Text'],
			['boolean', 'true or false'],
			['integer', '42'],
			['decimal', '3.14'],
			['double', '1.5E3'],
			['date', 'YYYY-MM-DD'],
			['dateTime', 'YYYY-MM-DDThh:mm:ss'],
			['anyURI', 'https://…'],
			['geo:wktLiteral', 'wkt literal · adds geo:']
		]);
		expect(items[0].selection).toEqual({ type: 'literal', annotation: {} });
		expect(items[8].selection).toEqual({ type: 'literal', annotation: { datatype: `${GEO}wktLiteral` }, missingPrefix: { prefix: 'geo', namespace: GEO } });
	});

	it('offers the languages in use first, each once in standard form, then the common languages', () => {
		const items = getLanguageItems(['de-de', 'fr', 'DE-DE', 'en']);
		const codes = items.map(item => item.code);

		expect(codes.slice(0, 3)).toEqual(['de-DE', 'fr', 'en']);
		expect(codes.filter(code => code.toLowerCase() === 'en')).toHaveLength(1);
		expect(codes).toContain('ja');
		expect(items[0].selection).toEqual({ type: 'literal', annotation: { language: 'de-DE' } });
		expect(items[0].description).toBe(new Intl.DisplayNames(undefined, { type: 'language' }).of('de-DE'));
	});

	it('finds the item of an annotation by its language in any spelling, by its datatype, and string for a plain string', () => {
		const languages = getLanguageItems(['de-DE']);
		const datatypes = getDatatypeItems([]);

		expect(languages.findIndex(item => item.key === getLiteralAnnotationItemKey({ language: 'de-de' }))).toBe(0);
		expect(datatypes.findIndex(item => item.key === getLiteralAnnotationItemKey({ datatype: XSD.date }))).toBe(5);
		expect(datatypes.findIndex(item => item.key === getLiteralAnnotationItemKey({}))).toBe(0);
	});

	it('narrows the items to those matching the search, and offers a well-formed language tag it does not list', () => {
		const languages = getLanguageItems(['en']);

		expect(filterLiteralAnnotationPickerItems(getDatatypeItems([]), 'date', 'datatype').map(item => item.code)).toEqual(['date', 'dateTime']);
		expect(filterLiteralAnnotationPickerItems(languages, 'EN', 'language')[0].code).toBe('en');
		expect(filterLiteralAnnotationPickerItems(languages, 'zh-hant-tw', 'language').map(item => [item.code, item.description])).toEqual([['zh-Hant-TW', 'Use this tag']]);
		expect(filterLiteralAnnotationPickerItems(languages, 'gmail', 'language')).toEqual([]);
		expect(filterLiteralAnnotationPickerItems(languages, 'ger', 'language').map(item => item.code)).toEqual(['de']);
		expect(filterLiteralAnnotationPickerItems(languages, 'xyz', 'language').map(item => item.code)).toEqual(['xyz']);
		expect(filterLiteralAnnotationPickerItems(getDatatypeItems([]), 'de-ch', 'datatype')).toEqual([]);
	});
});
