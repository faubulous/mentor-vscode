import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { EX, SynthesisFixtureOptions, createSynthesisInput, synthesizeEdit } from '@src/utilities/mocks/edit-synthesis-fixtures';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

const subject = RdfDataFactory.namedNode(`${EX}s`);

/**
 * Move the statement of `ex:<predicate>` of `ex:s` next to the one of `ex:<target>`.
 * @param body The statements of the document.
 * @param predicate The local name of the predicate that moves.
 * @param placement Whether it moves before or after the target.
 * @param target The local name of the predicate it moves next to.
 * @param options How the document is written.
 * @returns The edited body, or the rejection.
 */
function move(body: string, predicate: string, placement: 'before' | 'after', target: string, options: SynthesisFixtureOptions = {}): string {
	return synthesizeEdit(body, [{ op: 'moveProperty', subject, predicate: `${EX}${predicate}`, target: `${EX}${target}`, placement }], options);
}

describe('PropertyOperations.moveProperty', () => {
	const lines = `ex:s ex:a 1 ;\n    ex:b 2 ;\n    ex:c 3 .\n`;

	it('moves a statement up and down, keeping the separators and the line breaks in place', () => {
		expect(move(lines, 'c', 'before', 'a')).toBe(`ex:s ex:c 3 ;\n    ex:a 1 ;\n    ex:b 2 .\n`);
		expect(move(lines, 'a', 'after', 'c')).toBe(`ex:s ex:b 2 ;\n    ex:c 3 ;\n    ex:a 1 .\n`);
		expect(move(lines, 'b', 'before', 'a')).toBe(`ex:s ex:b 2 ;\n    ex:a 1 ;\n    ex:c 3 .\n`);
		expect(move(lines, 'b', 'after', 'c')).toBe(`ex:s ex:a 1 ;\n    ex:c 3 ;\n    ex:b 2 .\n`);
	});

	it('changes nothing where the statement already stands there', () => {
		expect(move(lines, 'a', 'before', 'b')).toBe(lines);
		expect(move(lines, 'b', 'after', 'a')).toBe(lines);
		expect(move(lines, 'b', 'before', 'b')).toBe(lines);
	});

	it('moves the statement with its objects, nested blank nodes and lists as they are written', () => {
		const body = `ex:s ex:a 1, 2 ;\n    ex:b [\n        ex:x ex:y\n    ] ;\n    ex:c ( 1 2 ) .\n`;

		expect(move(body, 'c', 'before', 'a')).toBe(`ex:s ex:c ( 1 2 ) ;\n    ex:a 1, 2 ;\n    ex:b [\n        ex:x ex:y\n    ] .\n`);
	});

	it('moves the comments written above a statement and the one ending its line with it', () => {
		const body = `ex:s ex:a 1 ; # one\n    # about b\n    ex:b 2 ;\n    ex:c 3 . # three\n`;

		expect(move(body, 'b', 'before', 'a')).toBe(`ex:s # about b\n    ex:b 2 ;\n    ex:a 1 ; # one\n    ex:c 3 . # three\n`);
		expect(move(body, 'a', 'after', 'c')).toBe(`ex:s # about b\n    ex:b 2 ;\n    ex:c 3 ; # three\n    ex:a 1 . # one\n`);
	});

	it('ends the line after a comment that moves onto a line other statements follow', () => {
		const body = `ex:s ex:a 1 ; # one\n    ex:b 2 ; ex:c 3 .\n`;

		expect(move(body, 'a', 'after', 'b')).toBe(`ex:s ex:b 2 ;\n    ex:a 1 ; # one\n    ex:c 3 .\n`);
	});

	it('moves a statement within a nested blank node', () => {
		const body = `ex:s ex:p [ ex:a 1 ; ex:b 2 ] .\n`;
		const nested = RdfDataFactory.blankNode(createSynthesisInput(body).quadContexts.find(quad => quad.predicate.value === `${EX}a`)!.subject.value);

		expect(synthesizeEdit(body, [{ op: 'moveProperty', subject: nested, predicate: `${EX}b`, target: `${EX}a`, placement: 'before' }])).toBe(`ex:s ex:p [ ex:b 2 ; ex:a 1 ] .\n`);
		expect(synthesizeEdit(`ex:s ex:p [ ex:a 1 ; # one\n    ex:b 2 ] .\n`, [{ op: 'moveProperty', subject: nested, predicate: `${EX}a`, target: `${EX}b`, placement: 'after' }])).toBe(`ex:s ex:p [ ex:b 2 ;\n    ex:a 1 # one\n] .\n`);
	});

	it('rejects a move between statements written in separate blocks or graphs', () => {
		expect(move(`ex:s ex:a 1 .\nex:s ex:b 2 .\n`, 'b', 'before', 'a')).toBe('rejected:separateBlocks');
		expect(move(`ex:s ex:a 1 ; ex:b 2 ; ex:a 3 .\n`, 'b', 'before', 'a')).toBe('rejected:separateBlocks');
		expect(move(`<${EX}s> <${EX}a> "1" .\n<${EX}s> <${EX}b> "2" .\n`, 'b', 'before', 'a', { syntax: RdfSyntax.NTriples })).toBe('rejected:separateBlocks');
	});

	it('rejects a move of a predicate the subject does not carry', () => {
		expect(move(lines, 'z', 'before', 'a')).toBe('rejected:predicateGone');
		expect(move(lines, 'a', 'before', 'z')).toBe('rejected:predicateGone');
	});
});
