import { describe, expect, it } from 'vitest';
import { OwlReasoner, RDF, RDFS, Store, XSD, _OWL, _RDFS, _SH, _XSD } from '@faubulous/mentor-rdf';
import { PredicateRangeResolver } from './predicate-range-resolver';

const V = 'http://example.org/vocabulary#';

const SCHEMA = 'https://schema.org/';

const PREAMBLE = `@prefix v: <${V}> .\n@prefix owl: <${_OWL}> .\n@prefix rdfs: <${_RDFS}> .\n@prefix xsd: <${_XSD}> .\n@prefix sh: <${_SH}> .\n@prefix schema: <${SCHEMA}> .\n`;

/**
 * A resolver over a vocabulary with ranges of datatypes and classes, schema.org ranges, typed
 * properties without a range, and a shape of trees, spread over graphs.
 * @returns The resolver.
 */
function createResolver(): PredicateRangeResolver {
	const store = new Store(new OwlReasoner());

	store.loadTurtle(`${PREAMBLE}
		v:planted rdfs:range xsd:date .
		v:note rdfs:range xsd:string .
		v:comment rdfs:range rdfs:Literal .
		v:hasLeaf rdfs:range v:Leaf .
		v:code rdfs:range v:Code .
		v:Code a rdfs:Datatype .
		v:mixed rdfs:range xsd:string , v:Leaf .
		v:knows a owl:ObjectProperty .
		v:height a owl:DatatypeProperty .
		v:untyped rdfs:label "untyped" .
	`, 'http://example.org/vocabulary', true);
	store.loadTurtle(`${PREAMBLE}
		schema:startDate schema:rangeIncludes schema:Date , schema:DateTime .
		schema:birthDate schema:rangeIncludes schema:Date .
		schema:name schema:rangeIncludes schema:Text .
		schema:author schema:rangeIncludes schema:Person , schema:Organization .
		schema:image schema:rangeIncludes schema:ImageObject , schema:Text .
	`, 'http://example.org/schema', true);
	store.loadTurtle(`${PREAMBLE}
		v:TreeShape a sh:NodeShape ;
			sh:targetClass v:Tree ;
			sh:property [ sh:path v:note ; sh:datatype xsd:integer ] ;
			sh:property [ sh:path v:untyped ; sh:class v:Leaf ] .
		v:Oak a sh:NodeShape , rdfs:Class ;
			sh:property [ sh:path v:height ; sh:nodeKind sh:IRI ] .
	`, 'http://example.org/shapes', true);

	return new PredicateRangeResolver(store);
}

describe('PredicateRangeResolver', () => {
	it('gives literals of the datatype a range names, plain literals for rdfs:Literal, and resources for a class', () => {
		const resolver = createResolver();

		expect(resolver.resolve(`${V}planted`, [])).toEqual({ type: 'literal', datatype: XSD.date, source: 'range' });
		expect(resolver.resolve(`${V}note`, [])).toEqual({ type: 'literal', datatype: XSD.string, source: 'range' });
		expect(resolver.resolve(`${V}comment`, [])).toEqual({ type: 'literal', source: 'range' });
		expect(resolver.resolve(`${V}hasLeaf`, [])).toEqual({ type: 'resource', source: 'range' });
		expect(resolver.resolve(`${V}code`, [])).toEqual({ type: 'literal', datatype: `${V}Code`, source: 'range' });
	});

	it('tells nothing from ranges that mix literals and resources', () => {
		expect(createResolver().resolve(`${V}mixed`, [])).toBeUndefined();
	});

	it('reads schema:rangeIncludes, its data types as literals of the XSD datatype they stand for', () => {
		const resolver = createResolver();

		expect(resolver.resolve(`${SCHEMA}birthDate`, [])).toEqual({ type: 'literal', datatype: XSD.date, source: 'range' });
		expect(resolver.resolve(`${SCHEMA}startDate`, [])).toEqual({ type: 'literal', source: 'range' });
		expect(resolver.resolve(`${SCHEMA}name`, [])).toEqual({ type: 'literal', source: 'range' });
		expect(resolver.resolve(`${SCHEMA}author`, [])).toEqual({ type: 'resource', source: 'range' });
		expect(resolver.resolve(`${SCHEMA}image`, [])).toBeUndefined();
	});

	it('follows the shapes of the types of the resource before the range of the predicate', () => {
		const resolver = createResolver();

		expect(resolver.resolve(`${V}note`, [`${V}Tree`])).toEqual({ type: 'literal', datatype: XSD.integer, source: 'range' });
		expect(resolver.resolve(`${V}untyped`, [`${V}Tree`])).toEqual({ type: 'resource', source: 'range' });
		expect(resolver.resolve(`${V}height`, [`${V}Oak`])).toEqual({ type: 'resource', source: 'range' });
		expect(resolver.resolve(`${V}note`, [`${V}Leaf`])).toEqual({ type: 'literal', datatype: XSD.string, source: 'range' });
	});

	it('falls back on the type of the property, and on the properties of RDF, RDFS and OWL known to take resources', () => {
		const resolver = createResolver();

		expect(resolver.resolve(`${V}knows`, [])).toEqual({ type: 'resource', source: 'propertyType' });
		expect(resolver.resolve(`${V}height`, [])).toEqual({ type: 'literal', source: 'propertyType' });
		expect(resolver.resolve(RDFS.seeAlso, [])).toEqual({ type: 'resource', source: 'propertyType' });
		expect(resolver.resolve(RDF.type, [])).toEqual({ type: 'resource', source: 'propertyType' });
		expect(resolver.resolve(`${V}untyped`, [])).toBeUndefined();
	});
});
