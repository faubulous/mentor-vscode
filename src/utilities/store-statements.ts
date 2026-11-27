import { RDF, RDFS, Store } from '@faubulous/mentor-rdf';
import { Quad_Object, Quad_Subject } from '@rdfjs/types';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

/**
 * Indicate whether the store holds a statement in any of its graphs.
 * @param store The store.
 * @param subject The subject.
 * @param predicate The IRI of the predicate.
 * @param object The object.
 * @returns `true` when it does.
 */
export function hasStatement(store: Store, subject: Quad_Subject, predicate: string, object: Quad_Object): boolean {
	for (const _quad of store.matchAll(undefined, subject, RdfDataFactory.namedNode(predicate), object)) {
		return true;
	}

	return false;
}

/**
 * The IRIs a resource has as the values of any of the given predicates, in all graphs of the store.
 * @param store The store.
 * @param subject The resource.
 * @param predicates The IRIs of the predicates.
 * @returns The IRIs, each once, in the order they were read.
 */
export function getObjectIris(store: Store, subject: Quad_Subject, predicates: readonly string[]): string[] {
	const objects = new Set<string>();

	for (const predicate of predicates) {
		for (const quad of store.matchAll(undefined, subject, RdfDataFactory.namedNode(predicate), null)) {
			if (quad.object.termType === 'NamedNode') {
				objects.add(quad.object.value);
			}
		}
	}

	return Array.from(objects);
}

/**
 * Indicate whether an IRI is an instance of any of the given classes, in any graph of the store.
 * @param store The store.
 * @param iri The IRI.
 * @param classes The IRIs of the classes.
 * @returns `true` when it is.
 */
export function isInstanceOf(store: Store, iri: string, classes: readonly string[]): boolean {
	const subject = RdfDataFactory.namedNode(iri);

	return classes.some(type => hasStatement(store, subject, RDF.type, RdfDataFactory.namedNode(type)));
}

/**
 * A class with all its superclasses, followed along `rdfs:subClassOf` in all graphs of the store.
 * @param store The store.
 * @param type The IRI of the class.
 * @returns The IRIs of the class and its superclasses.
 */
export function getClassWithSuperClasses(store: Store, type: string): Set<string> {
	const classes = new Set<string>([type]);
	const pending = [type];

	while (pending.length > 0) {
		const current = pending.pop()!;

		for (const superClass of getObjectIris(store, RdfDataFactory.namedNode(current), [RDFS.subClassOf])) {
			if (!classes.has(superClass)) {
				classes.add(superClass);
				pending.push(superClass);
			}
		}
	}

	return classes;
}
