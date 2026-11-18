import { describe, expect, it } from 'vitest';
import { OwlReasoner, Store, _OWL, _RDFS, _XSD } from '@faubulous/mentor-rdf';
import { StoreIconResolver } from './store-icon-resolver';

const V = 'http://example.org/vocabulary#';

/**
 * A resolver over a vocabulary with a class, an object property, properties of dates and numbers,
 * typed in one graph and given their ranges in another, and a datatype property without a range.
 * @returns The resolver.
 */
function createResolver(): StoreIconResolver {
	const store = new Store(new OwlReasoner());
	const preamble = `@prefix v: <${V}> .\n@prefix owl: <${_OWL}> .\n@prefix rdfs: <${_RDFS}> .\n@prefix xsd: <${_XSD}> .\n`;

	store.loadTurtle(`${preamble}
		v:Tree a owl:Class .
		v:hasLeaf a owl:ObjectProperty ; rdfs:range v:Leaf .
		v:planted a owl:DatatypeProperty .
		v:height a owl:DatatypeProperty ; rdfs:range xsd:decimal .
		v:note a owl:DatatypeProperty .
	`, 'http://example.org/vocabulary', true);
	store.loadTurtle(`${preamble}
		v:planted rdfs:range xsd:dateTime .
	`, 'http://example.org/ranges', true);

	return new StoreIconResolver(store);
}

describe('StoreIconResolver', () => {
	it('shows a property by the values its range tells, as the cards do', () => {
		const resolver = createResolver();

		expect(resolver.resolve(`${V}planted`)).toBe('calendar');
		expect(resolver.resolve(`${V}height`)).toBe('symbol-number');
		expect(resolver.resolve(`${V}hasLeaf`)).toBe('mentor-rdf-object-property');
		expect(resolver.resolve(`${V}note`)).toBe('symbol-text');
	});

	it('shows a resource by its type, and nothing for an IRI the store knows no type of', () => {
		const resolver = createResolver();

		expect(resolver.resolve(`${V}Tree`)).toBe('mentor-rdf-class');
		expect(resolver.resolve(`${V}Leaf`)).toBeUndefined();
	});
});
