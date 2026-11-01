import { describe, expect, it } from 'vitest';
import { RDF } from '@faubulous/mentor-rdf';
import { readTurtleQuadContexts } from '@src/utilities/mocks/factories';
import { ResourceIdentities } from './resource-identities';

const EX = 'http://example.org/';
const PREAMBLE = `@prefix ex: <${EX}> .\n\n`;

/**
 * The identifiers of the blank node subjects of a Turtle body, in document order, each once.
 */
function blankNodeIdsOf(body: string): string[] {
	const quads = readTurtleQuadContexts(PREAMBLE + body);
	const identities = new ResourceIdentities(quads);

	return Array.from(new Set(quads.filter(quad => quad.subject.termType === 'BlankNode').map(quad => identities.idOf(quad.subject))));
}

describe('ResourceIdentities', () => {
	it('names an anonymous value by the resource holding it, the predicate and its place among the anonymous values', () => {
		expect(blankNodeIdsOf('ex:s ex:p [ ex:q 1 ], [ ex:q 2 ] ; ex:r [ ex:q 3 ] .\n')).toEqual([
			`b:i:${EX}s>${EX}p#0`,
			`b:i:${EX}s>${EX}p#1`,
			`b:i:${EX}s>${EX}r#0`
		]);
	});

	it('keeps the names when an anonymous node is added before them elsewhere in the file', () => {
		const before = blankNodeIdsOf('ex:s ex:p [ ex:q 1 ] .\nex:t ex:p [ ex:q [ ex:r 2 ] ] .\n');
		const after = blankNodeIdsOf('ex:a ex:p [ ex:q 0 ] .\nex:s ex:p [ ex:q 1 ] .\nex:t ex:p [ ex:q [ ex:r 2 ] ] .\n');

		expect(after.slice(1)).toEqual(before);
		expect(before[2]).toBe(`b:b:i:${EX}t>${EX}p#0>${EX}q#0`);
	});

	it('names an anonymous subject of a block of its own by its place among those, and a labelled one by its label', () => {
		const ids = blankNodeIdsOf('[ ex:p 1 ] .\n_:x ex:p 2 .\n[ ex:p 3 ] .\n');

		expect(ids[0]).toBe('b:[0]');
		expect(ids[1]).toMatch(/^b:.*x$/);
		expect(ids[2]).toBe('b:[1]');
	});

	it('names the nodes of a list by the chain that leads to them', () => {
		const ids = blankNodeIdsOf('ex:s ex:p ( ex:a ex:b ) .\n');

		expect(ids[0]).toBe(`b:i:${EX}s>${EX}p#0`);
		expect(ids[1]).toBe(`b:b:i:${EX}s>${EX}p#0>${RDF.rest}#0`);
	});
});
