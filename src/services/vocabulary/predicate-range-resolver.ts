import { OWL, RDF, RDFS, SH, Store, XSD, _XSD } from '@faubulous/mentor-rdf';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { getSchemaOrgIris, getSchemaOrgLocalName, SchemaOrg } from '@src/utilities/schema-org';
import { getObjectIris, isInstanceOf } from '@src/utilities/store-statements';
import { PredicateRangeData } from './predicate-range';
import { PropertyShapeData, PropertyShapeIndex } from './property-shape-index';

/**
 * What a range says about the values of a predicate, before it is known where it was read from.
 */
type ValueRange = Omit<PredicateRangeData, 'source'>;

/**
 * The ranges that take literals of any datatype or language.
 */
const PLAIN_LITERAL_RANGES: ReadonlySet<string> = new Set([RDFS.Literal, RDF.langString]);

/**
 * The datatypes of RDF itself, which take literals of that datatype.
 */
const RDF_DATATYPES: ReadonlySet<string> = new Set([RDF.HTML, RDF.XMLLiteral, RDF.JSON]);

/**
 * The XSD datatype each schema.org data type is written as; `undefined` for text of any datatype.
 */
const SCHEMA_ORG_DATATYPES: ReadonlyMap<string, string | undefined> = new Map([
	[SchemaOrg.Text, undefined],
	[SchemaOrg.Boolean, XSD.boolean],
	[SchemaOrg.Date, XSD.date],
	[SchemaOrg.DateTime, XSD.dateTime],
	[SchemaOrg.Time, XSD.time],
	[SchemaOrg.Number, XSD.decimal],
	[SchemaOrg.Integer, XSD.integer],
	[SchemaOrg.Float, XSD.double]
]);

/**
 * The node kinds of SHACL that take resources.
 */
const RESOURCE_NODE_KINDS: ReadonlySet<string> = new Set([SH.IRI, SH.BlankNode, SH.BlankNodeOrIRI]);

/**
 * The properties of RDF, RDFS and OWL whose values are resources, which a new value starts as a
 * resource for where nothing else tells.
 */
const KNOWN_OBJECT_PROPERTIES: ReadonlySet<string> = new Set([
	RDF.type,
	RDFS.subClassOf,
	RDFS.domain,
	RDFS.range,
	RDFS.isDefinedBy,
	RDFS.seeAlso,
	OWL.equivalentClass,
	OWL.intersectionOf,
	OWL.unionOf,
	OWL.complementOf,
	OWL.onProperty,
	OWL.someValuesFrom,
	OWL.allValuesFrom
]);

/**
 * Tells what values a predicate takes for a resource, from all graphs of the store: first the
 * SHACL property shapes of the types of the resource, then the `rdfs:range` of the predicate, else
 * its `schema:rangeIncludes`; a datatype as the range gives literals of it, a class resources, and
 * ranges that mix both tell nothing. Where no range tells, an object property takes resources and a
 * datatype property literals. Memoized until the store changes.
 */
export class PredicateRangeResolver {
	/**
	 * The version of the store the ranges were read at.
	 */
	private _version = -1;

	/**
	 * The range of each predicate and set of types asked for, `undefined` where the store tells none.
	 */
	private readonly _ranges = new Map<string, PredicateRangeData | undefined>();

	/**
	 * Create a resolver.
	 * @param _store The store.
	 * @param _shapes The property shapes of types, read from the store.
	 */
	constructor(private readonly _store: Store, private readonly _shapes: PropertyShapeIndex) { }

	/**
	 * What values a predicate takes for a resource of the given types.
	 * @param predicate The IRI of the predicate.
	 * @param typeIris The types of the resource, asserted and inferred, whose shapes are read.
	 * @returns The range, or `undefined` where the store tells nothing.
	 */
	resolve(predicate: string, typeIris: readonly string[]): PredicateRangeData | undefined {
		if (this._version !== this._store.version) {
			this._version = this._store.version;
			this._ranges.clear();
		}

		const key = [predicate, ...[...typeIris].sort()].join('\n');

		if (!this._ranges.has(key)) {
			this._ranges.set(key, this._read(predicate, typeIris));
		}

		return this._ranges.get(key);
	}

	/**
	 * The classes the values of a predicate are instances of for a resource of the given types: those
	 * its property shapes name, else the classes among its ranges.
	 * @param predicate The IRI of the predicate.
	 * @param typeIris The types of the resource, asserted and inferred, whose shapes are read.
	 * @returns The IRIs of the classes; none where no shape or range names one.
	 */
	rangeClassesOf(predicate: string, typeIris: readonly string[]): string[] {
		const shaped = this._shapes.shapesOf(typeIris).flatMap(shape => shape.path === predicate && shape.class ? [shape.class] : []);

		if (shaped.length > 0) {
			return Array.from(new Set(shaped));
		}

		return this._rangesOf(predicate).filter(iri => this._classify(iri).type === 'resource');
	}

	/**
	 * Read what values a predicate takes, by the order of the sources.
	 * @param predicate The IRI of the predicate.
	 * @param typeIris The types of the resource.
	 * @returns The range, or `undefined`.
	 */
	private _read(predicate: string, typeIris: readonly string[]): PredicateRangeData | undefined {
		const range = this._fromShapes(predicate, typeIris) ?? this._fromRanges(predicate);

		if (range) {
			return { ...range, source: 'range' };
		}

		const fallback = this._fromPropertyType(predicate);

		return fallback ? { ...fallback, source: 'propertyType' } : undefined;
	}

	/**
	 * What the property shapes of the types of a resource say about a predicate.
	 * @param predicate The IRI of the predicate.
	 * @param typeIris The types of the resource.
	 * @returns The range of the first shape that tells one, or `undefined`.
	 */
	private _fromShapes(predicate: string, typeIris: readonly string[]): ValueRange | undefined {
		for (const shape of this._shapes.shapesOf(typeIris)) {
			const range = shape.path === predicate ? _rangeOfShape(shape) : undefined;

			if (range) {
				return range;
			}
		}

		return undefined;
	}

	/**
	 * What the ranges of a predicate say about its values: its `rdfs:range`, else its
	 * `schema:rangeIncludes`.
	 * @param predicate The IRI of the predicate.
	 * @returns The range, or `undefined` where there is none or the ranges mix literals and resources.
	 */
	private _fromRanges(predicate: string): ValueRange | undefined {
		return _combine(this._rangesOf(predicate).map(iri => this._classify(iri)));
	}

	/**
	 * The ranges of a predicate: its `rdfs:range`, else its `schema:rangeIncludes`.
	 * @param predicate The IRI of the predicate.
	 * @returns The IRIs of the ranges.
	 */
	private _rangesOf(predicate: string): string[] {
		const subject = RdfDataFactory.namedNode(predicate);
		const ranges = getObjectIris(this._store, subject, [RDFS.range]);

		return ranges.length > 0 ? ranges : getObjectIris(this._store, subject, getSchemaOrgIris(SchemaOrg.rangeIncludes));
	}

	/**
	 * What a range takes: literals for a datatype, of that datatype where it is one; resources for a
	 * class.
	 * @param iri The IRI of the range.
	 * @returns What the range takes.
	 */
	private _classify(iri: string): ValueRange {
		if (PLAIN_LITERAL_RANGES.has(iri)) {
			return { type: 'literal' };
		}

		if (iri.startsWith(_XSD) || RDF_DATATYPES.has(iri) || isInstanceOf(this._store, iri, [RDFS.Datatype])) {
			return { type: 'literal', datatype: iri };
		}

		const schemaOrgName = getSchemaOrgLocalName(iri);

		if (schemaOrgName !== undefined && SCHEMA_ORG_DATATYPES.has(schemaOrgName)) {
			return { type: 'literal', datatype: SCHEMA_ORG_DATATYPES.get(schemaOrgName) };
		}

		if (isInstanceOf(this._store, iri, getSchemaOrgIris(SchemaOrg.DataType))) {
			return { type: 'literal' };
		}

		return { type: 'resource' };
	}

	/**
	 * What the type of a property says about its values, where no range tells: an object property,
	 * or a property of RDF, RDFS or OWL known to take resources, takes resources, and a datatype
	 * property literals.
	 * @param predicate The IRI of the predicate.
	 * @returns The range, or `undefined`.
	 */
	private _fromPropertyType(predicate: string): ValueRange | undefined {
		if (KNOWN_OBJECT_PROPERTIES.has(predicate) || isInstanceOf(this._store, predicate, [OWL.ObjectProperty])) {
			return { type: 'resource' };
		}

		return isInstanceOf(this._store, predicate, [OWL.DatatypeProperty]) ? { type: 'literal' } : undefined;
	}
}

/**
 * What several ranges of one predicate say together: resources where all take resources; literals
 * where all take literals, of the datatype they all name; nothing where they mix both.
 * @param ranges The ranges.
 * @returns The range, or `undefined`.
 */
function _combine(ranges: readonly ValueRange[]): ValueRange | undefined {
	const types = new Set(ranges.map(range => range.type));

	if (types.size !== 1) {
		return undefined;
	}

	if (types.has('resource')) {
		return { type: 'resource' };
	}

	const datatypes = new Set(ranges.map(range => range.datatype));
	const [datatype] = datatypes;

	return datatypes.size === 1 && datatype !== undefined ? { type: 'literal', datatype } : { type: 'literal' };
}

/**
 * What a property shape says about its values: a datatype gives literals of it, a class or a node
 * kind of IRIs or blank nodes resources, the node kind of literals literals.
 * @param shape The property shape.
 * @returns The range, or `undefined` where the shape tells none.
 */
function _rangeOfShape(shape: PropertyShapeData): ValueRange | undefined {
	if (shape.datatype) {
		return { type: 'literal', datatype: shape.datatype };
	}

	if (shape.class || (shape.nodeKind && RESOURCE_NODE_KINDS.has(shape.nodeKind))) {
		return { type: 'resource' };
	}

	return shape.nodeKind === SH.Literal ? { type: 'literal' } : undefined;
}
