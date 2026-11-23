import { OWL, RDF, RDFS, SH, Store, XSD, _XSD } from '@faubulous/mentor-rdf';
import { Quad_Object, Quad_Subject } from '@rdfjs/types';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { getSchemaOrgIris, getSchemaOrgLocalName, SchemaOrg } from '@src/utilities/schema-org';
import { PredicateRangeData } from '@src/views/webviews/views/form-editor/form-editor-model';

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
	 */
	constructor(private readonly _store: Store) { }

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
	 * What the property shapes of the types of a resource say about a predicate: those of the node
	 * shapes that target a type, or that are the class themselves.
	 * @param predicate The IRI of the predicate.
	 * @param typeIris The types of the resource.
	 * @returns The range of the first shape that tells one, or `undefined`.
	 */
	private _fromShapes(predicate: string, typeIris: readonly string[]): ValueRange | undefined {
		const path = RdfDataFactory.namedNode(predicate);

		for (const type of typeIris) {
			for (const shape of this._nodeShapesOf(type)) {
				for (const quad of this._store.matchAll(undefined, shape, RdfDataFactory.namedNode(SH.property), null)) {
					const propertyShape = quad.object;

					if (_isSubject(propertyShape) && this._holds(propertyShape, SH.path, path)) {
						const range = this._rangeOfShape(propertyShape);

						if (range) {
							return range;
						}
					}
				}
			}
		}

		return undefined;
	}

	/**
	 * The node shapes of a class: those that target it, and the class itself where it is a shape.
	 * @param type The IRI of the class.
	 * @returns The shapes.
	 */
	private _nodeShapesOf(type: string): Quad_Subject[] {
		const typeNode = RdfDataFactory.namedNode(type);
		const shapes: Quad_Subject[] = Array.from(this._store.matchAll(undefined, null, RdfDataFactory.namedNode(SH.targetClass), typeNode), quad => quad.subject);

		if (this._holds(typeNode, RDF.type, RdfDataFactory.namedNode(SH.NodeShape))) {
			shapes.push(typeNode);
		}

		return shapes;
	}

	/**
	 * What a property shape says about its values: a datatype gives literals of it, a class or a
	 * node kind of IRIs or blank nodes resources, the node kind of literals literals.
	 * @param shape The property shape.
	 * @returns The range, or `undefined` where the shape tells none.
	 */
	private _rangeOfShape(shape: Quad_Subject): ValueRange | undefined {
		const datatype = this._objectOf(shape, SH.datatype);

		if (datatype) {
			return { type: 'literal', datatype };
		}

		if (this._objectOf(shape, SH.class)) {
			return { type: 'resource' };
		}

		const nodeKind = this._objectOf(shape, SH.nodeKind);

		if (nodeKind && RESOURCE_NODE_KINDS.has(nodeKind)) {
			return { type: 'resource' };
		}

		return nodeKind === SH.Literal ? { type: 'literal' } : undefined;
	}

	/**
	 * What the ranges of a predicate say about its values: its `rdfs:range`, else its
	 * `schema:rangeIncludes`.
	 * @param predicate The IRI of the predicate.
	 * @returns The range, or `undefined` where there is none or the ranges mix literals and resources.
	 */
	private _fromRanges(predicate: string): ValueRange | undefined {
		const ranges = this._objectsOf(predicate, [RDFS.range]);
		const named = ranges.length > 0 ? ranges : this._objectsOf(predicate, getSchemaOrgIris(SchemaOrg.rangeIncludes));

		return _combine(named.map(iri => this._classify(iri)));
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

		if (iri.startsWith(_XSD) || RDF_DATATYPES.has(iri) || this._isTypedAs(iri, [RDFS.Datatype])) {
			return { type: 'literal', datatype: iri };
		}

		const schemaOrgName = getSchemaOrgLocalName(iri);

		if (schemaOrgName !== undefined && SCHEMA_ORG_DATATYPES.has(schemaOrgName)) {
			return { type: 'literal', datatype: SCHEMA_ORG_DATATYPES.get(schemaOrgName) };
		}

		if (this._isTypedAs(iri, getSchemaOrgIris(SchemaOrg.DataType))) {
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
		if (KNOWN_OBJECT_PROPERTIES.has(predicate) || this._isTypedAs(predicate, [OWL.ObjectProperty])) {
			return { type: 'resource' };
		}

		return this._isTypedAs(predicate, [OWL.DatatypeProperty]) ? { type: 'literal' } : undefined;
	}

	/**
	 * The IRI a resource has as the value of a predicate, the first where it has several.
	 * @param subject The resource.
	 * @param predicate The IRI of the predicate.
	 * @returns The IRI, or `undefined`.
	 */
	private _objectOf(subject: Quad_Subject, predicate: string): string | undefined {
		for (const quad of this._store.matchAll(undefined, subject, RdfDataFactory.namedNode(predicate), null)) {
			if (quad.object.termType === 'NamedNode') {
				return quad.object.value;
			}
		}

		return undefined;
	}

	/**
	 * The IRIs an IRI has as the values of any of the given predicates.
	 * @param iri The IRI.
	 * @param predicates The IRIs of the predicates.
	 * @returns The IRIs, each once.
	 */
	private _objectsOf(iri: string, predicates: readonly string[]): string[] {
		const subject = RdfDataFactory.namedNode(iri);
		const objects = new Set<string>();

		for (const predicate of predicates) {
			for (const quad of this._store.matchAll(undefined, subject, RdfDataFactory.namedNode(predicate), null)) {
				if (quad.object.termType === 'NamedNode') {
					objects.add(quad.object.value);
				}
			}
		}

		return Array.from(objects);
	}

	/**
	 * Indicate whether the store holds a statement in any of its graphs.
	 * @param subject The subject.
	 * @param predicate The IRI of the predicate.
	 * @param object The object.
	 * @returns `true` when it does.
	 */
	private _holds(subject: Quad_Subject, predicate: string, object: Quad_Object): boolean {
		for (const _quad of this._store.matchAll(undefined, subject, RdfDataFactory.namedNode(predicate), object)) {
			return true;
		}

		return false;
	}

	/**
	 * Indicate whether an IRI is an instance of any of the given classes.
	 * @param iri The IRI.
	 * @param classes The IRIs of the classes.
	 * @returns `true` when it is.
	 */
	private _isTypedAs(iri: string, classes: readonly string[]): boolean {
		const subject = RdfDataFactory.namedNode(iri);

		return classes.some(type => this._holds(subject, RDF.type, RdfDataFactory.namedNode(type)));
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
 * Indicate whether a term can be the subject of a statement, as a property shape is.
 * @param term The term.
 * @returns `true` for an IRI or a blank node.
 */
function _isSubject(term: Quad_Object): term is Quad_Subject & Quad_Object {
	return term.termType === 'NamedNode' || term.termType === 'BlankNode';
}
