import { OWL, RDF, RDFS, Store } from '@faubulous/mentor-rdf';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { getSchemaOrgIris, SchemaOrg } from '@src/utilities/schema-org';
import { getClassWithSuperClasses, getObjectIris } from '@src/utilities/store-statements';
import { TermFit } from './term-search';
import { PropertyShapeIndex } from './property-shape-index';

/**
 * The domains every resource is in, which tell nothing about the resources a predicate is for.
 */
const GENERAL_DOMAINS: ReadonlySet<string> = new Set([RDFS.Resource, OWL.Thing]);

/**
 * Tells how terms fit the statement they are picked for, from all graphs of the store, so the
 * pickers offer the relevant ones first: a predicate fits a resource where a property shape of
 * one of its types names it, or where its domain is one of the types or a superclass of one; a
 * value fits where it is an instance of a class the range of the predicate names, or of a
 * subclass. Memoized until the store changes.
 */
export class TermFitResolver {
	/**
	 * The version of the store the fits were read at.
	 */
	private _version = -1;

	/**
	 * The types of each resource, with their superclasses.
	 */
	private readonly _types = new Map<string, ReadonlySet<string>>();

	/**
	 * The domains of each predicate, `schema:domainIncludes` included.
	 */
	private readonly _domains = new Map<string, readonly string[]>();

	/**
	 * Each class with its superclasses, and each set of types asked for with theirs.
	 */
	private readonly _closures = new Map<string, ReadonlySet<string>>();

	/**
	 * Create a resolver.
	 * @param _store The store.
	 * @param _shapes The property shapes of types, read from the store.
	 */
	constructor(private readonly _store: Store, private readonly _shapes: PropertyShapeIndex) { }

	/**
	 * How a predicate fits a resource of the given types.
	 * @param predicate The IRI of the predicate.
	 * @param typeIris The types of the resource, asserted and inferred.
	 * @returns `fits` where a shape of a type names it or its domain is a type of the resource,
	 * `general` where it has no domain but one every resource is in or the resource has no type,
	 * `other` otherwise.
	 */
	predicateFit(predicate: string, typeIris: readonly string[]): TermFit {
		this._clearIfChanged();

		if (this._shapes.shapesOf(typeIris).some(shape => shape.path === predicate)) {
			return 'fits';
		}

		const domains = this._domainsOf(predicate).filter(domain => !GENERAL_DOMAINS.has(domain));

		if (domains.length === 0 || typeIris.length === 0) {
			return 'general';
		}

		const types = this._closureOf(typeIris);

		return domains.some(domain => types.has(domain)) ? 'fits' : 'other';
	}

	/**
	 * How a resource fits as a value of a predicate whose values are instances of the given classes.
	 * @param iri The IRI of the resource.
	 * @param rangeClasses The classes the values of the predicate are instances of.
	 * @returns `fits` where it is an instance of one of them or of a subclass, `general` where no
	 * class is given or the resource has no type the store knows, `other` otherwise.
	 */
	valueFit(iri: string, rangeClasses: readonly string[]): TermFit {
		this._clearIfChanged();

		if (rangeClasses.length === 0) {
			return 'general';
		}

		const types = this._typesOf(iri);

		if (types.size === 0) {
			return 'general';
		}

		return rangeClasses.some(type => types.has(type)) ? 'fits' : 'other';
	}

	/**
	 * Forget what was read once the store changed.
	 */
	private _clearIfChanged(): void {
		if (this._version !== this._store.version) {
			this._version = this._store.version;
			this._types.clear();
			this._domains.clear();
			this._closures.clear();
		}
	}

	/**
	 * The domains of a predicate: its `rdfs:domain` and its `schema:domainIncludes`.
	 * @param predicate The IRI of the predicate.
	 * @returns The IRIs of the domains.
	 */
	private _domainsOf(predicate: string): readonly string[] {
		let domains = this._domains.get(predicate);

		if (!domains) {
			domains = getObjectIris(this._store, RdfDataFactory.namedNode(predicate), [RDFS.domain, ...getSchemaOrgIris(SchemaOrg.domainIncludes)]);
			this._domains.set(predicate, domains);
		}

		return domains;
	}

	/**
	 * The types of a resource with their superclasses.
	 * @param iri The IRI of the resource.
	 * @returns The IRIs of the classes.
	 */
	private _typesOf(iri: string): ReadonlySet<string> {
		let types = this._types.get(iri);

		if (!types) {
			types = this._closureOf(getObjectIris(this._store, RdfDataFactory.namedNode(iri), [RDF.type]));
			this._types.set(iri, types);
		}

		return types;
	}

	/**
	 * Classes with all their superclasses.
	 * @param typeIris The IRIs of the classes.
	 * @returns The IRIs of the classes and their superclasses.
	 */
	private _closureOf(typeIris: readonly string[]): ReadonlySet<string> {
		if (typeIris.length === 1) {
			return this._withSuperClasses(typeIris[0]);
		}

		const key = typeIris.join('\n');
		let closure = this._closures.get(key);

		if (!closure) {
			closure = new Set(typeIris.flatMap(type => Array.from(this._withSuperClasses(type))));
			this._closures.set(key, closure);
		}

		return closure;
	}

	/**
	 * A class with all its superclasses, followed along `rdfs:subClassOf` in all graphs.
	 * @param type The IRI of the class.
	 * @returns The IRIs of the class and its superclasses.
	 */
	private _withSuperClasses(type: string): ReadonlySet<string> {
		const known = this._closures.get(type);

		if (known) {
			return known;
		}

		const classes = getClassWithSuperClasses(this._store, type);

		this._closures.set(type, classes);

		return classes;
	}
}
