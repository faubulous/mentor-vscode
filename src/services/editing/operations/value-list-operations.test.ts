import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { RDF, XSD } from '@faubulous/mentor-rdf';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { EX, SynthesisFixtureOptions, anchorOf, createSynthesisInput, synthesizeEdit, synthesizePlan } from '@src/utilities/mocks/edit-synthesis-fixtures';
import { resolveFocusOffset } from '../edit-plan';
import { StatementValue } from '../statement-value';
import { TermRef } from '../term-ref';

const subject: TermRef = { kind: 'iri', iri: `${EX}s` };
const P = `${EX}p`;
const NT = 'http://example.org/';
const NTRIPLES: SynthesisFixtureOptions = { syntax: RdfSyntax.NTriples };
const NQUADS: SynthesisFixtureOptions = { syntax: RdfSyntax.NQuads };
const TRIG: SynthesisFixtureOptions = { syntax: RdfSyntax.TriG };

/**
 * A new IRI value in the example namespace.
 */
function iri(name: string): StatementValue {
	return { kind: 'term', term: { kind: 'iri', iri: `${EX}${name}` } };
}

/**
 * A new literal value.
 */
function literal(value: string, extra: { language?: string; datatype?: string } = {}): StatementValue {
	return { kind: 'term', term: { kind: 'literal', value, ...extra } };
}

/**
 * The value written at a text of the body, kept as it is.
 */
function kept(body: string, needle: string, options: SynthesisFixtureOptions = {}, occurrence = 1): StatementValue {
	return { kind: 'existing', anchor: anchorOf(body, needle, options, occurrence) };
}

/**
 * Set the values of `ex:p` of `ex:s`.
 */
function setValues(body: string, values: StatementValue[], options: SynthesisFixtureOptions = {}, predicate = P): string {
	return synthesizeEdit(body, [{ op: 'setValues', subject, predicate, values }], options);
}

describe('ValueListOperations.setValues in Turtle', () => {
	it('replaces a value in its place and keeps the others as written', () => {
		const body = `ex:s ex:p "a", ex:b .\n`;

		expect(setValues(body, [literal('c'), kept(body, 'ex:b')])).toBe(`ex:s ex:p "c", ex:b .\n`);
		expect(setValues(body, [kept(body, '"a"'), literal('c')])).toBe(`ex:s ex:p "a", "c" .\n`);
	});

	it('writes a new value after the value before it, or before the value after it', () => {
		const body = `ex:s ex:p ex:a, ex:b .\n`;

		expect(setValues(body, [kept(body, 'ex:a'), iri('x'), kept(body, 'ex:b')])).toBe(`ex:s ex:p ex:a, ex:x, ex:b .\n`);
		expect(setValues(body, [iri('x'), kept(body, 'ex:a'), kept(body, 'ex:b')])).toBe(`ex:s ex:p ex:x, ex:a, ex:b .\n`);
		expect(setValues(body, [kept(body, 'ex:a'), kept(body, 'ex:b'), iri('x'), iri('y')])).toBe(`ex:s ex:p ex:a, ex:b, ex:x, ex:y .\n`);
	});

	it('removes the first, a middle and the last value with their separator', () => {
		const body = `ex:s ex:p ex:a, ex:b, ex:c .\n`;

		expect(setValues(body, [kept(body, 'ex:b'), kept(body, 'ex:c')])).toBe(`ex:s ex:p ex:b, ex:c .\n`);
		expect(setValues(body, [kept(body, 'ex:a'), kept(body, 'ex:c')])).toBe(`ex:s ex:p ex:a, ex:c .\n`);
		expect(setValues(body, [kept(body, 'ex:a'), kept(body, 'ex:b')])).toBe(`ex:s ex:p ex:a, ex:b .\n`);
		expect(setValues(body, [kept(body, 'ex:a'), iri('x')])).toBe(`ex:s ex:p ex:a, ex:x .\n`);
	});

	it('writes the values one per line where the statement does', () => {
		const body = `ex:s ex:p ex:a,\n        ex:b .\n`;

		expect(setValues(body, [kept(body, 'ex:a'), kept(body, 'ex:b'), iri('c')])).toBe(`ex:s ex:p ex:a,\n        ex:b,\n        ex:c .\n`);
	});

	it('writes literals, numbers and the datatypes the way the document does', () => {
		const body = `ex:s ex:p ex:a .\n`;

		expect(setValues(body, [literal('Tree', { language: 'en' }), literal('42', { datatype: XSD.integer }), literal('2024-01-01', { datatype: XSD.date })]))
			.toBe(`ex:s ex:p "Tree"@en, 42, "2024-01-01"^^xsd:date .\n`);
	});

	it('changes the order of the values of a statement', () => {
		const body = `ex:s ex:p ex:a, ex:b .\n`;

		expect(setValues(body, [kept(body, 'ex:b'), kept(body, 'ex:a')])).toBe(`ex:s ex:p ex:b, ex:a .\n`);
		expect(setValues(body, [kept(body, 'ex:b'), iri('x'), kept(body, 'ex:a')])).toBe(`ex:s ex:p ex:b, ex:x, ex:a .\n`);
	});

	it('refuses to change the order of values with comments between them', () => {
		const body = `ex:s ex:p ex:a, # first\n    ex:b .\n`;

		expect(setValues(body, [kept(body, 'ex:b'), kept(body, 'ex:a')])).toBe('rejected:unsupportedConstruct');
	});

	it('keeps a comment between values when one of them goes', () => {
		const body = `ex:s ex:p ex:a, # first\n    ex:b .\n`;

		expect(setValues(body, [kept(body, 'ex:b')])).toContain('# first');
	});

	it('keeps a nested node byte for byte and counts the statements of one that goes', () => {
		const body = `ex:s ex:p [ ex:q "x" ;\n        ex:r 1 ], ex:a .\n`;
		const node = kept(body, '[');

		expect(setValues(body, [node, iri('b')])).toBe(`ex:s ex:p [ ex:q "x" ;\n        ex:r 1 ], ex:b .\n`);
		expect(synthesizePlan(body, [{ op: 'setValues', subject, predicate: P, values: [kept(body, 'ex:a')] }]).quadCountDelta).toBe(-3);
		expect(setValues(body, [kept(body, 'ex:a')])).toBe(`ex:s ex:p ex:a .\n`);
	});

	it('edits the values of a nested node', () => {
		const body = `ex:s ex:p [ ex:q "x" ] .\n`;
		const node = createSynthesisInput(body).quadContexts.find(quad => quad.predicate.value === `${EX}q`)!.subject;

		expect(synthesizeEdit(body, [{ op: 'setValues', subject: { kind: 'bnode', id: node.value }, predicate: `${EX}q`, values: [literal('y'), literal('2', { datatype: XSD.integer })] }]))
			.toBe(`ex:s ex:p [ ex:q "y", 2 ] .\n`);
	});

	it('writes new lists, and keeps the items of a written list by their anchor', () => {
		const body = `ex:s ex:p ( ex:a [ ex:q "x" ] ) .\n`;

		expect(setValues(body, [{ kind: 'list', items: [kept(body, '['), kept(body, 'ex:a'), iri('b')] }])).toBe(`ex:s ex:p ( [ ex:q "x" ] ex:a ex:b ) .\n`);
		expect(setValues(body, [{ kind: 'list', items: [] }])).toBe(`ex:s ex:p ( ) .\n`);
		expect(setValues(body, [kept(body, '('), { kind: 'list', items: [literal('n')] }])).toBe(`ex:s ex:p ( ex:a [ ex:q "x" ] ), ( "n" ) .\n`);
	});

	it('leaves values written in another block of the subject where they are', () => {
		const body = `ex:s ex:p ex:a .\nex:s ex:q ex:x ;\n    ex:p ex:b .\n`;

		expect(setValues(body, [kept(body, 'ex:a'), kept(body, 'ex:b'), iri('c')])).toBe(`ex:s ex:p ex:a .\nex:s ex:q ex:x ;\n    ex:p ex:b, ex:c .\n`);
		expect(setValues(body, [kept(body, 'ex:b')])).toBe(`ex:s ex:q ex:x ;\n    ex:p ex:b .\n`);
		expect(setValues(body, [kept(body, 'ex:b'), kept(body, 'ex:a')])).toBe('rejected:unsupportedConstruct');
	});

	it('removes a statement of the predicate that is left without values', () => {
		const body = `ex:s ex:p ex:a ;\n    ex:q ex:x ;\n    ex:p ex:b .\n`;

		expect(setValues(body, [kept(body, 'ex:b')])).toBe(`ex:s ex:q ex:x ;\n    ex:p ex:b .\n`);
	});

	it('writes the values of a predicate the subject does not carry after its last one', () => {
		expect(setValues(`ex:s ex:q ex:a .\n`, [literal('x'), iri('b')])).toBe(`ex:s ex:q ex:a ;\n    ex:p "x", ex:b .\n`);
		expect(setValues(`ex:s ex:q ex:a .\n`, [{ kind: 'existing', anchor: 0 }])).toBe('rejected:notFound');
	});

	it('removes the predicate when no values are given, as deleteProperty does', () => {
		expect(setValues(`ex:s ex:p ex:a ;\n    ex:q ex:b .\n`, [])).toBe(`ex:s ex:q ex:b .\n`);
		expect(setValues(`ex:s ex:p ex:a .\n`, [])).toBe('rejected:wouldRemoveSubject');
	});

	it('keeps a subject whose statements are all of the removed predicate, however many blocks write them', () => {
		expect(setValues(`ex:s ex:p ex:a .\n\nex:s ex:p ex:b .\n`, [])).toBe('rejected:wouldRemoveSubject');
		expect(setValues(`ex:s ex:p ex:a .\n\nex:s ex:q ex:b .\n`, [])).toBe(`ex:s ex:q ex:b .\n`);
	});

	it('removes a block that loses all its statements with the comment above it and one blank line', () => {
		expect(setValues(`ex:s ex:q ex:a .\n\n# about p\nex:s ex:p ex:b . # b\n\nex:t ex:q ex:c .\n`, [])).toBe(`ex:s ex:q ex:a .\n\nex:t ex:q ex:c .\n`);
		expect(setValues(`ex:s ex:q ex:a .\n\nex:s ex:p ex:b .\n`, [])).toBe(`ex:s ex:q ex:a .\n`);
		expect(setValues(`ex:s ex:q ex:a .\n\nex:s ex:p ex:b .\n\nex:s ex:p ex:c .\n`, [])).toBe(`ex:s ex:q ex:a .\n`);
		expect(setValues(`# Section\n\nex:s ex:p ex:b .\n\nex:s ex:q ex:a .\n`, [])).toBe(`# Section\n\nex:s ex:q ex:a .\n`);
	});

	it('writes rdf:type as the document does', () => {
		const body = `ex:s a ex:C .\n`;

		expect(setValues(body, [kept(body, 'ex:C'), iri('D')], {}, RDF.type)).toBe(`ex:s a ex:C, ex:D .\n`);
		expect(setValues(`ex:s ex:q ex:a .\n`, [iri('C')], {}, RDF.type)).toBe(`ex:s ex:q ex:a ;\n    a ex:C .\n`);
	});

	it('refuses values that refer to nothing written, are listed twice, or cannot be written', () => {
		const body = `ex:s ex:p ex:a .\n`;

		expect(setValues(body, [{ kind: 'existing', anchor: 3 }])).toBe('rejected:notFound');
		expect(setValues(body, [kept(body, 'ex:a'), kept(body, 'ex:a')])).toBe('rejected:invalidTerm');
		expect(setValues(body, [{ kind: 'term', term: { kind: 'iri', iri: 'not an iri' } }])).toBe('rejected:invalidTerm');
		expect(setValues(body, [literal('x', { language: 'not a tag' })])).toBe('rejected:invalidTerm');
		expect(setValues(body, [{ kind: 'list', items: [{ kind: 'existing', anchor: anchorOf(body, 'ex:a') }] }])).toBe('rejected:notFound');
	});

	it('focuses the first new value', () => {
		const body = `ex:s ex:p ex:a .\n`;
		const input = createSynthesisInput(body);
		const plan = synthesizePlan(body, [{ op: 'setValues', subject, predicate: P, values: [kept(body, 'ex:a'), iri('b')] }]);
		const offset = resolveFocusOffset(plan)!;

		expect(plan.focus?.target).toBe('value');
		expect(input.text.slice(0, plan.edits[0].start) + plan.edits[0].newText).toContain('ex:b');
		expect(offset).toBe(anchorOf(body, 'ex:a') + 'ex:a, '.length);
	});
});

describe('ValueListOperations.setValues in TriG', () => {
	it('writes the values in the graph of their statement', () => {
		const body = `ex:g { ex:s ex:p "a" . }\n`;

		expect(setValues(body, [literal('b'), literal('c')], TRIG)).toBe(`ex:g { ex:s ex:p "b", "c" . }\n`);
	});
});

describe('ValueListOperations.setValues in N-Triples and N-Quads', () => {
	const line = (object: string, graph = ''): string => `<${NT}s> <${NT}p> ${object}${graph} .`;

	it('keeps a subject whose lines all state the removed predicate', () => {
		expect(setValues(`${line('"a"')}\n${line('"b"')}\n`, [], NTRIPLES)).toBe('rejected:wouldRemoveSubject');
	});

	it('writes one line per value, in full form', () => {
		const body = `${line('"a"')}\n`;

		expect(setValues(body, [literal('b'), literal('c')], NTRIPLES)).toBe(`${line('"b"')}\n${line('"c"')}\n`);
		expect(setValues(body, [literal('42', { datatype: XSD.integer })], NTRIPLES)).toBe(`${line(`"42"^^<${XSD.integer}>`)}\n`);
	});

	it('writes a new line next to the line of its neighbour and removes the lines of values that go', () => {
		const body = `${line('"a"')}\n${line('"b"')}\n`;

		expect(setValues(body, [kept(body, '"a"', NTRIPLES), literal('x'), kept(body, '"b"', NTRIPLES)], NTRIPLES)).toBe(`${line('"a"')}\n${line('"x"')}\n${line('"b"')}\n`);
		expect(setValues(body, [literal('x'), kept(body, '"a"', NTRIPLES), kept(body, '"b"', NTRIPLES)], NTRIPLES)).toBe(`${line('"x"')}\n${line('"a"')}\n${line('"b"')}\n`);
		expect(setValues(body, [kept(body, '"b"', NTRIPLES)], NTRIPLES)).toBe(`${line('"b"')}\n`);
		expect(setValues(body, [kept(body, '"a"', NTRIPLES), literal('x')], NTRIPLES)).toBe(`${line('"a"')}\n${line('"x"')}\n`);
	});

	it('writes rdf:type in full and the values of a new predicate after the last line of the subject', () => {
		const body = `${line('"a"')}\n`;

		expect(synthesizeEdit(body, [{ op: 'setValues', subject, predicate: RDF.type, values: [iri('C')] }], NTRIPLES))
			.toBe(`${line('"a"')}\n<${NT}s> <${RDF.type}> <${EX}C> .\n`);
	});

	it('keeps the graph of the line in N-Quads', () => {
		const body = `${line('"a"', ` <${NT}g>`)}\n`;

		expect(setValues(body, [kept(body, '"a"', NQUADS), literal('b')], NQUADS)).toBe(`${line('"a"', ` <${NT}g>`)}\n${line('"b"', ` <${NT}g>`)}\n`);
	});

	it('refuses lists and a new order of lines', () => {
		const body = `${line('"a"')}\n${line('"b"')}\n`;

		expect(setValues(body, [{ kind: 'list', items: [literal('x')] }], NTRIPLES)).toBe('rejected:unsupportedSyntax');
		expect(setValues(body, [kept(body, '"b"', NTRIPLES), kept(body, '"a"', NTRIPLES)], NTRIPLES)).toBe('rejected:unsupportedConstruct');
	});
});
