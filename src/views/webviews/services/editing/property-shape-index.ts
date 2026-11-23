import { RDF, SH, Store } from '@faubulous/mentor-rdf';
import { Quad_Subject } from '@rdfjs/types';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { getObjectIris, hasStatement } from '@src/utilities/store-statements';

/**
 * A SHACL property shape of a type: the predicate it is about and what it says of the values.
 */
export interface PropertyShapeData {
	/**
	 * The IRI of the predicate of the shape, its `sh:path`.
	 */
	path: string;

	/**
	 * The IRI of the datatype its values have, its `sh:datatype`.
	 */
	datatype?: string;

	/**
	 * The IRI of the class its values are instances of, its `sh:class`.
	 */
	class?: string;

	/**
	 * The IRI of the node kind of its values, its `sh:nodeKind`.
	 */
	nodeKind?: string;
}

/**
 * Reads the SHACL property shapes that apply to resources of given types, from all graphs of the
 * store: those of the node shapes that target a type, or that are the class themselves. Only
 * shapes whose path is a predicate are read. Memoized until the store changes.
 */
export class PropertyShapeIndex {
	/**
	 * The version of the store the shapes were read at.
	 */
	private _version = -1;

	/**
	 * The property shapes of each set of types asked for.
	 */
	private readonly _shapes = new Map<string, readonly PropertyShapeData[]>();

	/**
	 * Create an index.
	 * @param _store The store.
	 */
	constructor(private readonly _store: Store) { }

	/**
	 * The property shapes that apply to a resource of the given types, in the order of the types.
	 * @param typeIris The types of the resource, asserted and inferred.
	 * @returns The shapes.
	 */
	shapesOf(typeIris: readonly string[]): readonly PropertyShapeData[] {
		if (this._version !== this._store.version) {
			this._version = this._store.version;
			this._shapes.clear();
		}

		const key = typeIris.join('\n');
		let shapes = this._shapes.get(key);

		if (!shapes) {
			shapes = typeIris.flatMap(type => this._nodeShapesOf(type).flatMap(shape => this._propertyShapesOf(shape)));
			this._shapes.set(key, shapes);
		}

		return shapes;
	}

	/**
	 * The node shapes of a class: those that target it, and the class itself where it is a shape.
	 * @param type The IRI of the class.
	 * @returns The shapes.
	 */
	private _nodeShapesOf(type: string): Quad_Subject[] {
		const typeNode = RdfDataFactory.namedNode(type);
		const shapes: Quad_Subject[] = Array.from(this._store.matchAll(undefined, null, RdfDataFactory.namedNode(SH.targetClass), typeNode), quad => quad.subject);

		if (hasStatement(this._store, typeNode, RDF.type, RdfDataFactory.namedNode(SH.NodeShape))) {
			shapes.push(typeNode);
		}

		return shapes;
	}

	/**
	 * The property shapes of a node shape whose path is a predicate.
	 * @param shape The node shape.
	 * @returns The property shapes.
	 */
	private _propertyShapesOf(shape: Quad_Subject): PropertyShapeData[] {
		const shapes: PropertyShapeData[] = [];

		for (const quad of this._store.matchAll(undefined, shape, RdfDataFactory.namedNode(SH.property), null)) {
			const node = quad.object;

			if (node.termType !== 'NamedNode' && node.termType !== 'BlankNode') {
				continue;
			}

			const [path] = getObjectIris(this._store, node, [SH.path]);

			if (path) {
				const [datatype] = getObjectIris(this._store, node, [SH.datatype]);
				const [type] = getObjectIris(this._store, node, [SH.class]);
				const [nodeKind] = getObjectIris(this._store, node, [SH.nodeKind]);

				shapes.push({ path, datatype, class: type, nodeKind });
			}
		}

		return shapes;
	}
}
