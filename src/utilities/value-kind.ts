/**
 * The kind of values a property takes: literals, resources (IRIs and blank nodes), or either.
 * Derived from how the property is used until a property schema says otherwise.
 */
export type ValueKind = 'literal' | 'resource' | 'any';
