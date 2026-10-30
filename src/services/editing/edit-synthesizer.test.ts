import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { createSynthesisInput, EX, synthesizeEdit } from '@src/utilities/mocks/edit-synthesis-fixtures';
import { EditOperation } from './edit-operation';
import { TermRef } from './term-ref';
import { EditVerifier } from './edit-verifier';
import { SynthesisInput } from './synthesis-context';

/**
 * Build the synthesis input of a Turtle body.
 */
function inputOf(body: string, style: Partial<SynthesisInput['style']> = {}): SynthesisInput {
	return createSynthesisInput(body, { style });
}

/**
 * Synthesize and verify operations on a Turtle body, returning the edited body or the rejection reason.
 */
function edit(body: string, operations: EditOperation[], style?: Partial<SynthesisInput['style']>): string {
	return synthesizeEdit(body, operations, { style });
}

const subject: TermRef = { kind: 'iri', iri: `${EX}s` };

const iri = (name: string): TermRef => ({ kind: 'iri', iri: `${EX}${name}` });


describe('EditSynthesizer', () => {
	describe('setValues without values', () => {
		it('removes every group of the predicate with its values', () => {
			const body = `ex:s ex:p ex:a, ex:b ;\n    ex:q ex:c ;\n    ex:p ex:d .\n`;

			expect(edit(body, [{ op: 'setValues', subject, predicate: `${EX}p`, values: [] }])).toBe(`ex:s ex:q ex:c .\n`);
		});

		it('removes neighbouring groups as one range', () => {
			const body = `ex:s ex:q ex:c ;\n    ex:p ex:a ;\n    ex:p ex:b ;\n    ex:r ex:d .\n`;

			expect(edit(body, [{ op: 'setValues', subject, predicate: `${EX}p`, values: [] }])).toBe(`ex:s ex:q ex:c ;\n    ex:r ex:d .\n`);
		});

		it('takes nested nodes along with the removed values', () => {
			expect(edit(`ex:s ex:q ex:c ;\n    ex:p [ ex:r "x" ] .\n`, [{ op: 'setValues', subject, predicate: `${EX}p`, values: [] }])).toBe(`ex:s ex:q ex:c .\n`);
		});

		it('refuses to remove the only predicate of a resource', () => {
			expect(edit(`ex:s ex:p ex:a, ex:b .\n`, [{ op: 'setValues', subject, predicate: `${EX}p`, values: [] }])).toBe('rejected:wouldRemoveSubject');
		});
	});

	describe('several operations', () => {
		it('applies independent operations in one plan', () => {
			const body = `ex:s ex:p ex:a ;\n    ex:q ex:b .\n`;

			expect(edit(body, [
				{ op: 'setValues', subject, predicate: `${EX}p`, values: [{ kind: 'term', term: iri('x') }] },
				{ op: 'setValues', subject, predicate: `${EX}q`, values: [{ kind: 'term', term: iri('y') }] }
			])).toBe(`ex:s ex:p ex:x ;\n    ex:q ex:y .\n`);
		});

		it('rejects operations that touch the same text', () => {
			expect(edit(`ex:s ex:p ex:a .\n`, [
				{ op: 'setValues', subject, predicate: `${EX}p`, values: [{ kind: 'term', term: iri('x') }] },
				{ op: 'setValues', subject, predicate: `${EX}p`, values: [{ kind: 'term', term: iri('y') }] }
			])).toBe('rejected:ambiguous');
		});

	});
});

describe('EditVerifier', () => {
	it('rejects an edit that breaks the syntax', () => {
		const input = inputOf(`ex:s ex:p ex:a .\n`);
		const period = input.text.lastIndexOf('.');
		const result = new EditVerifier(input).verify({ edits: [{ start: period, end: period + 1, newText: '' }], expectedChanges: [] });

		expect(result.ok).toBe(false);
	});

	it('rejects an edit that changes more statements than planned', () => {
		const input = inputOf(`ex:s ex:p ex:a .\n`);
		const result = new EditVerifier(input).verify({
			edits: [{ start: input.text.length, end: input.text.length, newText: 'ex:s ex:q ex:b .\n' }],
			expectedChanges: []
		});

		expect(result.ok).toBe(false);
	});

	it('rejects an edit that replaces a statement it does not name by another one', () => {
		const input = inputOf(`ex:s ex:p ex:a .\nex:s ex:q ex:b .\n`);
		const start = input.text.indexOf('ex:b');
		const result = new EditVerifier(input).verify({
			edits: [{ start, end: start + 4, newText: 'ex:c' }],
			expectedChanges: []
		});

		expect(result).toMatchObject({ ok: false, message: expect.stringContaining(`<${EX}q>`) });
	});

	it('rejects an edit that moves a statement to another graph', () => {
		const input = createSynthesisInput(`ex:g { ex:s ex:p ex:a . }\n`, { syntax: RdfSyntax.TriG });
		const start = input.text.indexOf('ex:g');
		const result = new EditVerifier(input).verify({
			edits: [{ start, end: start + 4, newText: 'ex:h' }],
			expectedChanges: []
		});

		expect(result.ok).toBe(false);
	});

	it('rejects an edit that writes a statement into another graph than it names', () => {
		const input = createSynthesisInput(`ex:g { ex:s ex:p ex:a . }\n`, { syntax: RdfSyntax.TriG });
		const start = input.text.indexOf('ex:a');
		const edit = { start: start + 4, end: start + 4, newText: ', ex:b' };
		const added = { subject, predicate: `${EX}p`, object: iri('b'), delta: 1 };

		expect(new EditVerifier(input).verify({ edits: [edit], expectedChanges: [{ ...added, graph: { kind: 'default' } }] }).ok).toBe(false);
		expect(new EditVerifier(input).verify({ edits: [edit], expectedChanges: [{ ...added, graph: { kind: 'iri', iri: `${EX}g` } }] }).ok).toBe(true);
	});

	it('accepts an edit that changes exactly the statements it names', () => {
		const input = inputOf(`ex:s ex:p ex:a .\n`);
		const start = input.text.indexOf('ex:a');
		const result = new EditVerifier(input).verify({
			edits: [{ start, end: start + 4, newText: 'ex:b' }],
			expectedChanges: [{ subject, predicate: `${EX}p`, object: iri('a'), graph: { kind: 'default' }, delta: -1 }, { subject, predicate: `${EX}p`, object: iri('b'), graph: { kind: 'default' }, delta: 1 }]
		});

		expect(result.ok).toBe(true);
	});

	it('rejects an edit whose expected statement does not appear', () => {
		const input = inputOf(`ex:s ex:p ex:a .\n`);
		const result = new EditVerifier(input).verify({
			edits: [{ start: input.text.length, end: input.text.length, newText: 'ex:s ex:q ex:b .\n' }],
			expectedChanges: [{ subject, predicate: `${EX}q`, object: iri('c'), graph: { kind: 'default' }, delta: 1 }]
		});

		expect(result.ok).toBe(false);
	});
});
