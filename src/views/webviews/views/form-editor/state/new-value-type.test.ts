import { describe, expect, it } from 'vitest';
import { XSD } from '@faubulous/mentor-rdf/ontologies';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { PredicateRangeData } from '../form-editor-model';
import { getDefaultAnnotation, getDefaultValueType, startsLiteral } from './new-value-type';
import { RowValue } from './row-value';

const LITERAL: RowValue = { kind: 'term', term: RdfDataFactory.literal('Oak') };

const RESOURCE: RowValue = { kind: 'term', term: RdfDataFactory.namedNode('http://example.org/Oak') };

const DATE_RANGE: PredicateRangeData = { type: 'literal', datatype: XSD.date, source: 'range' };

const OBJECT_PROPERTY: PredicateRangeData = { type: 'resource', source: 'propertyType' };

describe('getDefaultValueType', () => {
	it('gives the type of a resource resources and its label text', () => {
		expect(getDefaultValueType('type', [LITERAL], DATE_RANGE)).toEqual({ type: 'resource' });
		expect(getDefaultValueType('label', [RESOURCE], OBJECT_PROPERTY)).toEqual({ type: 'literal' });
	});

	it('follows a range before the values, with the datatype it names', () => {
		expect(getDefaultValueType(undefined, [RESOURCE], DATE_RANGE)).toEqual({ type: 'literal', datatype: XSD.date });
		expect(getDefaultValueType(undefined, [LITERAL], { type: 'resource', source: 'range' })).toEqual({ type: 'resource' });
	});

	it('follows the last value where no range tells, before the type of the property', () => {
		expect(getDefaultValueType(undefined, [RESOURCE, LITERAL], OBJECT_PROPERTY)).toEqual({ type: 'literal' });
		expect(getDefaultValueType(undefined, [LITERAL, RESOURCE], undefined)).toEqual({ type: 'resource' });
	});

	it('follows the type of the property where the row has no value, else starts text', () => {
		expect(getDefaultValueType(undefined, [], OBJECT_PROPERTY)).toEqual({ type: 'resource' });
		expect(getDefaultValueType(undefined, [], undefined)).toEqual({ type: 'literal' });
	});
});

describe('startsLiteral', () => {
	it('starts a literal from the first character where a new value starts as one, and never for a resource', () => {
		expect(startsLiteral('T', { type: 'literal' })).toBe(true);
		expect(startsLiteral(' ', { type: 'literal' })).toBe(false);
		expect(startsLiteral('a tree', { type: 'resource' })).toBe(false);
	});
});

describe('getDefaultAnnotation', () => {
	it('gives a started literal the datatype of its range, and none for text', () => {
		expect(getDefaultAnnotation({ type: 'literal', datatype: XSD.date })).toEqual({ datatype: XSD.date });
		expect(getDefaultAnnotation({ type: 'literal', datatype: XSD.string })).toEqual({});
		expect(getDefaultAnnotation({ type: 'literal' })).toEqual({});
	});
});
