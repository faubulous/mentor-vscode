/**
 * What values a predicate takes for a resource, as the store tells it: by a range or a shape, or
 * only by the type of the property.
 */
export interface PredicateRangeData {
	/**
	 * Whether the predicate takes literals or resources.
	 */
	type: 'literal' | 'resource';

	/**
	 * The IRI of the datatype of its literals, where the range names one.
	 */
	datatype?: string;

	/**
	 * Where it was read from: a range of the predicate, its `schema:rangeIncludes`, or a SHACL shape
	 * of the resource, which decide the type of a new value before its other values do; or only the
	 * type of the property, such as an object property, which decides it after them.
	 */
	source: 'range' | 'propertyType';
}
