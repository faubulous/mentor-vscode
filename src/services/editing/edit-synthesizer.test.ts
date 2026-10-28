import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { _RDFS, _XSD } from '@faubulous/mentor-rdf';
import { QuadContext, RdfSyntax, TurtleLexer, TurtleParser, TurtleReader, assignBlankNodeIds } from '@faubulous/mentor-rdf-parsers';
import { EditOperation } from './edit-operation';
import { TermRef } from './term-ref';
import { EditSynthesizer } from './edit-synthesizer';
import { isEditRejection } from './edit-rejection';
import { EditPlan } from './edit-plan';
import { EditVerifier } from './edit-verifier';
import { StatementLocator, ValueLocation } from './statement-locator';
import { SynthesisInput } from './synthesis-context';
import { applyTextEdits } from '@src/utilities/text-edits';

const EX = 'http://example.org/';
const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

const NAMESPACES = { ex: EX, rdfs: _RDFS, xsd: _XSD };

const PREAMBLE = `@prefix ex: <${EX}> .\n@prefix rdfs: <${_RDFS}> .\n@prefix xsd: <${_XSD}> .\n\n`;

/**
 * Parse Turtle into quad contexts the way the document context does.
 */
function parse(text: string): { tokens: SynthesisInput['tokens']; quadContexts: QuadContext[] } {
	const lexer = new TurtleLexer();
	lexer.blankNodeIdGenerator = undefined;

	const tokens = assignBlankNodeIds(lexer.tokenize(text).tokens);
	const cst = new TurtleParser().parse(tokens);

	return { tokens, quadContexts: new TurtleReader().readQuadContexts(cst, tokens) };
}

/**
 * Build the synthesis input of a Turtle body.
 */
function inputOf(body: string, style: Partial<SynthesisInput['style']> = {}): SynthesisInput {
	const text = PREAMBLE + body;

	return {
		text,
		...parse(text),
		namespaces: NAMESPACES,
		syntax: RdfSyntax.Turtle,
		style: { tabSize: 4, insertSpaces: true, ...style }
	};
}

/**
 * Synthesize and verify operations, returning the edited body or the rejection reason.
 */
function edit(body: string, operations: EditOperation[], style?: Partial<SynthesisInput['style']>): string {
	const input = inputOf(body, style);
	const plan = new EditSynthesizer(input).synthesize(operations);

	if (isEditRejection(plan)) {
		return `rejected:${plan.reason}`;
	}

	const verification = new EditVerifier(input).verify(plan);

	if (!verification.ok) {
		return `unverified:${verification.message}`;
	}

	return applyTextEdits(input.text, plan.edits).slice(PREAMBLE.length);
}

const subject: TermRef = { kind: 'iri', iri: `${EX}s` };

const iri = (name: string): TermRef => ({ kind: 'iri', iri: `${EX}${name}` });

/**
 * Locate a value of the test subject by its predicate name and its index under the predicate.
 */
function valueOf(body: string, predicateName: string, index: number): ValueLocation {
	const context = new EditSynthesizer(inputOf(body)).createContext([]);
	const predicate = `${EX}${predicateName}`;
	const group = new StatementLocator(context.model).blocksOf(subject).flatMap(block => block.groups).find(candidate => candidate.predicateIri === predicate)!;

	return { subject, predicate, anchor: group.objects[index].start };
}
const literal = (value: string, extra: Partial<Extract<TermRef, { kind: 'literal' }>> = {}): TermRef => ({ kind: 'literal', value, ...extra });

describe('EditSynthesizer', () => {
	describe('deleteProperty', () => {
		it('removes every group of the predicate with its values', () => {
			const body = `ex:s ex:p ex:a, ex:b ;\n    ex:q ex:c ;\n    ex:p ex:d .\n`;

			expect(edit(body, [{ op: 'deleteProperty', subject, predicate: `${EX}p` }])).toBe(`ex:s ex:q ex:c .\n`);
		});

		it('removes neighbouring groups as one range', () => {
			const body = `ex:s ex:q ex:c ;\n    ex:p ex:a ;\n    ex:p ex:b ;\n    ex:r ex:d .\n`;

			expect(edit(body, [{ op: 'deleteProperty', subject, predicate: `${EX}p` }])).toBe(`ex:s ex:q ex:c ;\n    ex:r ex:d .\n`);
		});

		it('takes nested nodes along with the removed values', () => {
			expect(edit(`ex:s ex:q ex:c ;\n    ex:p [ ex:r "x" ] .\n`, [{ op: 'deleteProperty', subject, predicate: `${EX}p` }])).toBe(`ex:s ex:q ex:c .\n`);
		});

		it('refuses to remove the only predicate of a resource', () => {
			expect(edit(`ex:s ex:p ex:a, ex:b .\n`, [{ op: 'deleteProperty', subject, predicate: `${EX}p` }])).toBe('rejected:wouldRemoveSubject');
		});
	});

	describe('addSubject', () => {
		it('appends a block after one blank line, replacing trailing whitespace', () => {
			const initial = [{ predicate: RDF_TYPE, value: iri('C') }, { predicate: `${_RDFS}label`, value: literal('New', { language: 'en' }) }];

			expect(edit(`ex:s ex:p ex:a .\n\n\n`, [{ op: 'addSubject', iri: `${EX}n`, initial }]))
				.toBe(`ex:s ex:p ex:a .\n\nex:n a ex:C ;\n    rdfs:label "New"@en .\n`);
		});

		it('follows the predicate indentation of the document', () => {
			const initial = [{ predicate: `${EX}p`, value: iri('a') }, { predicate: `${EX}q`, value: iri('b') }];

			expect(edit(`ex:s ex:p ex:a ;\n  ex:q ex:b .\n`, [{ op: 'addSubject', iri: `${EX}n`, initial }]))
				.toBe(`ex:s ex:p ex:a ;\n  ex:q ex:b .\n\nex:n ex:p ex:a ;\n  ex:q ex:b .\n`);
		});

		it('rejects a resource that is already described, an empty one and a bad IRI', () => {
			expect(edit(`ex:s ex:p ex:a .\n`, [{ op: 'addSubject', iri: `${EX}s`, initial: [{ predicate: `${EX}p`, value: iri('b') }] }])).toBe('rejected:inUse');
			expect(edit(`ex:s ex:p ex:a .\n`, [{ op: 'addSubject', iri: `${EX}n`, initial: [] }])).toBe('rejected:invalidTerm');
			expect(edit(`ex:s ex:p ex:a .\n`, [{ op: 'addSubject', iri: 'not an iri', initial: [{ predicate: `${EX}p`, value: iri('b') }] }])).toBe('rejected:invalidTerm');
		});
	});

	describe('deleteSubject', () => {
		it('leaves the comments written inside another resource where they are', () => {
			// The reader reports a comment from inside an earlier block among this block's leading
			// comments; reaching back to it would delete everything in between.
			const body = `# The thing itself.\nex:Thing a ex:Class ;\n    # about the label\n    rdfs:label "x" .\n\nex:Other a ex:Class .\n`;

			expect(edit(body, [{ op: 'deleteSubject', subject: { kind: 'iri', iri: `${EX}Other` } }]))
				.toBe(`# The thing itself.\nex:Thing a ex:Class ;\n    # about the label\n    rdfs:label "x" .\n`);
		});

		it('removes every block of the resource with its leading comments and one blank line', () => {
			const body = `# About s\nex:s ex:p ex:a .\n\nex:o ex:q ex:s .\n\nex:s ex:r ex:c . # end\n`;

			expect(edit(body, [{ op: 'deleteSubject', subject }])).toBe(`ex:o ex:q ex:s .\n`);
		});

		it('removes an inline blank node through the value that holds it', () => {
			const body = `ex:s ex:p [ ex:q "x" ], ex:o .\n`;
			const input = inputOf(body);
			const nested = input.quadContexts.find(quad => quad.predicate.value === `${EX}q`)!;

			expect(edit(body, [{ op: 'deleteSubject', subject: { kind: 'bnode', id: nested.subject.value } }])).toBe(`ex:s ex:p ex:o .\n`);
		});

		it('refuses to delete a list head on its own', () => {
			const body = `ex:s ex:p ( ex:a ) .\n`;
			const input = inputOf(body);
			const head = input.quadContexts.find(quad => quad.predicate.value.endsWith('#first'))!;

			expect(edit(body, [{ op: 'deleteSubject', subject: { kind: 'bnode', id: head.subject.value } }])).toBe('rejected:unsupportedConstruct');
		});
	});

	describe('renameSubject', () => {
		it('rewrites every mention of the resource but not the declarations', () => {
			const body = `ex:s ex:p ex:a ;\n    ex:q <${EX}s> .\nex:o ex:r ex:s .\n`;

			expect(edit(body, [{ op: 'renameSubject', subject, iri: `${EX}t` }])).toBe(`ex:t ex:p ex:a ;\n    ex:q ex:t .\nex:o ex:r ex:t .\n`);
		});

		it('writes the new IRI in full when no prefix covers it', () => {
			expect(edit(`ex:s ex:p ex:a .\n`, [{ op: 'renameSubject', subject, iri: 'http://other.org/t' }])).toBe(`<http://other.org/t> ex:p ex:a .\n`);
		});

		it('rejects a name that is already taken', () => {
			expect(edit(`ex:s ex:p ex:a .\nex:t ex:p ex:b .\n`, [{ op: 'renameSubject', subject, iri: `${EX}t` }])).toBe('rejected:inUse');
		});
	});

	describe('addNestedNode', () => {
		it('adds an inline node with its first statements as a value', () => {
			const initial = [{ predicate: RDF_TYPE, value: iri('T') }, { predicate: `${EX}q`, value: literal('x') }];

			expect(edit(`ex:s ex:p ex:a .\n`, [{ op: 'addNestedNode', parent: subject, predicate: `${EX}p`, initial }])).toBe(`ex:s ex:p ex:a, [ a ex:T ; ex:q "x" ] .\n`);
		});

		it('adds the node under a new predicate when the subject lacks it', () => {
			const initial = [{ predicate: `${EX}q`, value: literal('x') }];

			expect(edit(`ex:s ex:p ex:a .\n`, [{ op: 'addNestedNode', parent: subject, predicate: `${EX}n`, initial }])).toBe(`ex:s ex:p ex:a ;\n    ex:n [ ex:q "x" ] .\n`);
		});

		it('needs at least one statement', () => {
			expect(edit(`ex:s ex:p ex:a .\n`, [{ op: 'addNestedNode', parent: subject, predicate: `${EX}p`, initial: [] }])).toBe('rejected:invalidTerm');
		});
	});

	describe('adding a resource after another', () => {
		it('writes the new block right after the block of the given resource', () => {
			const body = `ex:a ex:p ex:x .\n\nex:b ex:p ex:y .\n`;
			const text = edit(body, [{ op: 'addSubject', iri: `${EX}n`, initial: [{ predicate: RDF_TYPE, value: iri('C') }], after: { kind: 'iri', iri: `${EX}a` } }]);

			expect(text.indexOf('ex:n')).toBeGreaterThan(text.indexOf('ex:a ex:p'));
			expect(text.indexOf('ex:n')).toBeLessThan(text.indexOf('ex:b ex:p'));
			expect(text).toContain('ex:x .\n\nex:n');
		});

		it('rejects a resource the document does not write', () => {
			expect(edit(`ex:a ex:p ex:x .\n`, [{ op: 'addSubject', iri: `${EX}n`, initial: [{ predicate: RDF_TYPE, value: iri('C') }], after: { kind: 'iri', iri: `${EX}missing` } }])).toBe('rejected:notFound');
		});
	});

	describe('moving properties', () => {
		const subject: TermRef = { kind: 'iri', iri: `${EX}s` };
		const body = `ex:s ex:p ex:a ;\n    ex:q ex:b , ex:c ;\n    ex:r [ ex:x "y" ] .\n`;

		it('moves a predicate before another and to the end, keeping the lines as written', () => {
			expect(edit(body, [{ op: 'moveProperty', subject, predicate: `${EX}r`, before: `${EX}p` }]))
				.toBe(`ex:s ex:r [ ex:x "y" ] ;\n    ex:p ex:a ;\n    ex:q ex:b , ex:c .\n`);
			expect(edit(body, [{ op: 'moveProperty', subject, predicate: `${EX}p` }]))
				.toBe(`ex:s ex:q ex:b , ex:c ;\n    ex:r [ ex:x "y" ] ;\n    ex:p ex:a .\n`);
		});

		it('changes nothing when the predicate already stands there', () => {
			expect(edit(body, [{ op: 'moveProperty', subject, predicate: `${EX}q`, before: `${EX}r` }])).toBe(body);
		});

		it('rejects a predicate the subject does not write', () => {
			expect(edit(body, [{ op: 'moveProperty', subject, predicate: `${EX}missing`, before: `${EX}p` }])).toBe('rejected:notFound');
		});
	});

	describe('several operations', () => {
		it('applies independent operations in one plan', () => {
			const body = `ex:s ex:p ex:a ;\n    ex:q ex:b .\n`;

			expect(edit(body, [
				{ op: 'replaceStatement', subject, predicate: `${EX}p`, text: 'ex:p ex:x' },
				{ op: 'replaceStatement', subject, predicate: `${EX}q`, text: 'ex:q ex:y' }
			])).toBe(`ex:s ex:p ex:x ;\n    ex:q ex:y .\n`);
		});

		it('rejects operations that touch the same text', () => {
			expect(edit(`ex:s ex:p ex:a .\n`, [
				{ op: 'replaceStatement', subject, predicate: `${EX}p`, text: 'ex:p ex:x' },
				{ op: 'replaceStatement', subject, predicate: `${EX}p`, text: 'ex:p ex:y' }
			])).toBe('rejected:ambiguous');
		});

	});

	describe('namespaces', () => {
		it('declares a prefix after the existing declarations in their style', () => {
			const input = inputOf(`ex:s ex:p ex:a .\n`, { sortPrefixes: false });
			const plan = new EditSynthesizer(input).synthesize([{ op: 'addNamespace', prefix: 'foaf', iri: 'http://xmlns.com/foaf/0.1/' }]);
			const text = applyTextEdits(input.text, (plan as { edits: { start: number; end: number; newText: string }[] }).edits);

			// The preamble uses @prefix, so the new declaration does too, right after the last one.
			expect(text).toBe(`${PREAMBLE.trimEnd()}\n@prefix foaf: <http://xmlns.com/foaf/0.1/> .\n\nex:s ex:p ex:a .\n`);
		});

		it('keeps the declarations sorted when asked to', () => {
			const input = inputOf(`ex:s ex:p ex:a .\n`, { sortPrefixes: true });
			const plan = new EditSynthesizer(input).synthesize([{ op: 'addNamespace', prefix: 'foaf', iri: 'http://xmlns.com/foaf/0.1/' }]);

			expect(isEditRejection(plan)).toBe(false);

			const text = applyTextEdits(input.text, (plan as { edits: { start: number; end: number; newText: string }[] }).edits);

			expect(text.indexOf('@prefix foaf:')).toBeGreaterThan(text.indexOf('@prefix ex:'));
			expect(text.indexOf('@prefix foaf:')).toBeLessThan(text.indexOf('@prefix rdfs:'));
			expect(text).toContain('@prefix foaf: <http://xmlns.com/foaf/0.1/> .');
		});

		it('treats a declaration that already exists as done and refuses a conflicting one', () => {
			expect(edit(`ex:s ex:p ex:a .\n`, [{ op: 'addNamespace', prefix: 'ex', iri: EX }])).toBe(`ex:s ex:p ex:a .\n`);
			expect(edit(`ex:s ex:p ex:a .\n`, [{ op: 'addNamespace', prefix: 'ex', iri: 'http://other.org/' }])).toBe('rejected:inUse');
		});

		it('declares a prefix in the same step as the value that needs it', () => {
			const input = inputOf(`ex:s ex:p ex:a .\n`, { sortPrefixes: false });
			const plan = new EditSynthesizer(input).synthesize([
				{ op: 'addNamespace', prefix: 'foaf', iri: 'http://xmlns.com/foaf/0.1/' },
				{ op: 'replaceStatement', subject, predicate: `${EX}p`, text: 'ex:p foaf:Person' }
			]);

			expect(isEditRejection(plan)).toBe(false);
			expect(applyTextEdits(input.text, (plan as { edits: { start: number; end: number; newText: string }[] }).edits)).toContain('ex:s ex:p foaf:Person .');
		});
	});
});

describe('EditVerifier', () => {
	it('rejects an edit that breaks the syntax', () => {
		const input = inputOf(`ex:s ex:p ex:a .\n`);
		const period = input.text.lastIndexOf('.');
		const result = new EditVerifier(input).verify({ edits: [{ start: period, end: period + 1, newText: '' }], expectations: [], quadCountDelta: 0 });

		expect(result.ok).toBe(false);
	});

	it('rejects an edit that changes more statements than planned', () => {
		const input = inputOf(`ex:s ex:p ex:a .\n`);
		const result = new EditVerifier(input).verify({
			edits: [{ start: input.text.length, end: input.text.length, newText: 'ex:s ex:q ex:b .\n' }],
			expectations: [],
			quadCountDelta: 0
		});

		expect(result.ok).toBe(false);
	});

	it('rejects an edit whose expected statement does not appear', () => {
		const input = inputOf(`ex:s ex:p ex:a .\n`);
		const result = new EditVerifier(input).verify({
			edits: [{ start: input.text.length, end: input.text.length, newText: 'ex:s ex:q ex:b .\n' }],
			expectations: [{ subject, predicate: `${EX}q`, object: iri('c'), delta: 1 }],
			quadCountDelta: 1
		});

		expect(result.ok).toBe(false);
	});
});

describe('replaceStatement', () => {
	const P = `${EX}p`;
	const Q = `${EX}q`;

	/**
	 * Replace the statement of a predicate of `ex:s`.
	 */
	function replace(body: string, text: string, predicate = P): string {
		return edit(body, [{ op: 'replaceStatement', subject, predicate, text }]);
	}

	/**
	 * Add a statement to `ex:s` from a line.
	 */
	function add(body: string, text: string): string {
		return edit(body, [{ op: 'replaceStatement', subject, text }]);
	}

	it('rewrites the values of a predicate in place', () => {
		expect(replace(`ex:s ex:p ex:a, ex:b .\n`, 'ex:p ex:c, ex:d')).toBe(`ex:s ex:p ex:c, ex:d .\n`);
	});

	it('adds and removes values', () => {
		expect(replace(`ex:s ex:p ex:a .\n`, 'ex:p ex:a, "x"@en')).toBe(`ex:s ex:p ex:a, "x"@en .\n`);
		expect(replace(`ex:s ex:p ex:a, ex:b .\n`, 'ex:p ex:b')).toBe(`ex:s ex:p ex:b .\n`);
	});

	it('changes the predicate, expecting the statements under the old and the new one', () => {
		const input = inputOf(`ex:s ex:p ex:a ;\n    ex:q ex:b .\n`);
		const plan = new EditSynthesizer(input).synthesize([{ op: 'replaceStatement', subject, predicate: P, text: 'ex:r ex:a' }]);

		expect(isEditRejection(plan)).toBe(false);
		expect((plan as { expectations: { predicate: string; delta: number }[] }).expectations).toEqual([
			{ subject, predicate: P, object: iri('a'), delta: -1 },
			{ subject, predicate: `${EX}r`, object: iri('a'), delta: 1 }
		]);
		expect(replace(`ex:s ex:p ex:a ;\n    ex:q ex:b .\n`, 'ex:r ex:a')).toBe(`ex:s ex:r ex:a ;\n    ex:q ex:b .\n`);
	});

	it('writes the predicate the way the document does', () => {
		expect(edit(`ex:s a ex:C .\n`, [{ op: 'replaceStatement', subject, predicate: RDF_TYPE, text: `<${RDF_TYPE}> ex:D` }])).toBe(`ex:s a ex:D .\n`);
		expect(replace(`ex:s ex:p ex:a .\n`, `<${EX}p> <${EX}b>`)).toBe(`ex:s ex:p <${EX}b> .\n`);
	});

	it('splices a kept nested node byte for byte, with its statements', () => {
		const body = `ex:s ex:p [ ex:q "x" ;\n        ex:r 1 ], ex:a .\n`;
		const input = inputOf(body);
		const plan = new EditSynthesizer(input).synthesize([{ op: 'replaceStatement', subject, predicate: P, text: 'ex:p ex:b, […]' }]);

		expect(replace(body, 'ex:p ex:b, […]')).toBe(`ex:s ex:p ex:b, [ ex:q "x" ;\n        ex:r 1 ] .\n`);
		expect(replace(body, 'ex:p [ ], ex:a')).toBe(body);
		expect((plan as { quadCountDelta: number }).quadCountDelta).toBe(0);
	});

	it('counts the statements of a removed nested node', () => {
		const body = `ex:s ex:p [ ex:q "x" ; ex:r 1 ], ex:a .\n`;
		const plan = new EditSynthesizer(inputOf(body)).synthesize([{ op: 'replaceStatement', subject, predicate: P, text: 'ex:p ex:a' }]);

		expect((plan as { quadCountDelta: number }).quadCountDelta).toBe(-3);
		expect(replace(body, 'ex:p ex:a')).toBe(`ex:s ex:p ex:a .\n`);
	});

	it('rewrites a list', () => {
		expect(replace(`ex:s ex:p ( ex:a ex:b ) .\n`, 'ex:p ( ex:b ex:a )')).toBe(`ex:s ex:p ( ex:b ex:a ) .\n`);
		expect(replace(`ex:s ex:p ( ex:a [ ex:q "x" ] ) .\n`, 'ex:p ( […] ex:a )')).toBe(`ex:s ex:p ( [ ex:q "x" ] ex:a ) .\n`);
	});

	it('keeps the objects one per line when they were written so', () => {
		expect(replace(`ex:s ex:p ex:a,\n        ex:b .\n`, 'ex:p ex:a, ex:b, ex:c')).toBe(`ex:s ex:p ex:a,\n        ex:b,\n        ex:c .\n`);
	});

	it('uses a prefix declared in the same action', () => {
		const input = inputOf(`ex:s ex:p ex:a .\n`, { sortPrefixes: false });
		const plan = new EditSynthesizer(input).synthesize([
			{ op: 'addNamespace', prefix: 'foaf', iri: 'http://xmlns.com/foaf/0.1/' },
			{ op: 'replaceStatement', subject, predicate: P, text: 'ex:p foaf:Person' }
		]);

		expect(isEditRejection(plan)).toBe(false);
		expect(new EditVerifier(input).verify(plan as EditPlan).ok).toBe(true);
		expect(applyTextEdits(input.text, (plan as { edits: { start: number; end: number; newText: string }[] }).edits)).toContain('ex:s ex:p foaf:Person .');
	});

	it('keeps a comment written inside the statement after it', () => {
		expect(replace(`ex:s ex:p ex:a , # first\n    ex:b .\n`, 'ex:p ex:x')).toBe(`ex:s ex:p ex:x # first\n .\n`);
	});

	it('removes further groups of the predicate in the block', () => {
		expect(replace(`ex:s ex:p ex:a ;\n    ex:q ex:b ;\n    ex:p ex:c .\n`, 'ex:p ex:d')).toBe(`ex:s ex:p ex:d ;\n    ex:q ex:b .\n`);
	});

	it('edits the statement of a nested node', () => {
		const body = `ex:s ex:p [ ex:q "x" ] .\n`;
		const nested = inputOf(body).quadContexts.find(quad => quad.predicate.value === Q)!;

		expect(edit(body, [{ op: 'replaceStatement', subject: { kind: 'bnode', id: nested.subject.value }, predicate: Q, text: 'ex:q "y", 2' }]))
			.toBe(`ex:s ex:p [ ex:q "y", 2 ] .\n`);
	});

	it('appends a new predicate after the last one', () => {
		expect(add(`ex:s ex:p ex:a .\n`, 'ex:q "x", [ ex:r 1 ]')).toBe(`ex:s ex:p ex:a ;\n    ex:q "x", [ ex:r 1 ] .\n`);
	});

	it('rejects a new line naming a predicate the resource carries', () => {
		expect(add(`ex:s ex:p ex:a .\n`, 'ex:p ex:b')).toBe('rejected:ambiguous');
	});

	it('rejects text that does not parse, states several predicates, or mismatches the nested nodes', () => {
		expect(replace(`ex:s ex:p ex:a .\n`, 'ex:p "unterminated')).toBe('rejected:invalidTerm');
		expect(replace(`ex:s ex:p ex:a .\n`, 'ex:p ex:a ; ex:q ex:b')).toBe('rejected:invalidTerm');
		expect(replace(`ex:s ex:p ex:a .\n`, 'ex:p ex:a . ex:t ex:q ex:b')).toBe('rejected:invalidTerm');
		expect(replace(`ex:s ex:p ex:a .\n`, 'ex:p […]')).toBe('rejected:invalidTerm');
		expect(replace(`ex:s ex:p [ ex:q "x" ], [ ex:r 1 ] .\n`, 'ex:p […]')).toBe('rejected:invalidTerm');
		expect(add(`ex:s ex:p ex:a .\n`, 'ex:q […]')).toBe('rejected:invalidTerm');
		expect(replace(`ex:s ex:p ex:a .\n`, 'ex:q ex:b', `${EX}missing`)).toBe('rejected:notFound');
	});
});

describe('EditSynthesizer comments', () => {
	const Q = `${EX}q`;

	describe('setPropertyComments', () => {
		it('writes the lines above the predicate', () => {
			expect(edit(`ex:s ex:p ex:a ;\n    ex:q ex:b .\n`, [{ op: 'setPropertyComments', subject, predicate: Q, comments: ['one', 'two'] }]))
				.toBe(`ex:s ex:p ex:a ;\n    # one\n    # two\n    ex:q ex:b .\n`);
		});

		it('replaces and removes an existing run', () => {
			const body = `ex:s ex:p ex:a ;\n    # old\n    ex:q ex:b .\n`;

			expect(edit(body, [{ op: 'setPropertyComments', subject, predicate: Q, comments: ['new'] }])).toBe(`ex:s ex:p ex:a ;\n    # new\n    ex:q ex:b .\n`);
			expect(edit(body, [{ op: 'setPropertyComments', subject, predicate: Q, comments: [] }])).toBe(`ex:s ex:p ex:a ;\n    ex:q ex:b .\n`);
		});

		it('moves a predicate sharing the line of its subject onto a line of its own', () => {
			expect(edit(`ex:s ex:p ex:a .\n`, [{ op: 'setPropertyComments', subject, predicate: `${EX}p`, comments: ['c'] }])).toBe(`ex:s\n    # c\n    ex:p ex:a .\n`);
		});

		it('focuses the predicate the lines introduce', () => {
			const plan = new EditSynthesizer(inputOf(`ex:s ex:p ex:a ;\n    ex:q ex:b .\n`)).synthesize([{ op: 'setPropertyComments', subject, predicate: Q, comments: ['c'] }]);

			expect(plan).toMatchObject({ focus: { target: 'predicate' } });
		});
	});

	describe('setComment, addComment and deleteComment', () => {
		it('writes and replaces the run above a resource', () => {
			expect(edit(`ex:s ex:p ex:a .\n`, [{ op: 'setComment', at: { kind: 'resource', subject }, text: 'About s' }])).toBe(`# About s\nex:s ex:p ex:a .\n`);
			expect(edit(`# old\n# lines\nex:s ex:p ex:a .\n`, [{ op: 'setComment', at: { kind: 'resource', subject }, text: 'About s\nreally' }])).toBe(`# About s\n# really\nex:s ex:p ex:a .\n`);
		});

		it('rewrites one of the runs above a resource that blank lines keep apart', () => {
			const body = `# file\n\n# old\nex:s ex:p ex:a .\n`;

			expect(edit(body, [{ op: 'setComment', at: { kind: 'resource', subject, run: 0 }, text: 'header' }])).toBe(`# header\n\n# old\nex:s ex:p ex:a .\n`);
			expect(edit(body, [{ op: 'setComment', at: { kind: 'resource', subject, run: 1 }, text: 'new' }])).toBe(`# file\n\n# new\nex:s ex:p ex:a .\n`);
			expect(edit(body, [{ op: 'setComment', at: { kind: 'resource', subject }, text: 'new' }])).toBe(`# file\n\n# new\nex:s ex:p ex:a .\n`);
			expect(edit(body, [{ op: 'deleteComment', at: { kind: 'resource', subject, run: 2 } }])).toBe('rejected:notFound');
		});

		it('writes the run above a property', () => {
			expect(edit(`ex:s ex:p ex:a ;\n    ex:q ex:b .\n`, [{ op: 'setComment', at: { kind: 'property', subject, predicate: Q }, text: 'c' }]))
				.toBe(`ex:s ex:p ex:a ;\n    # c\n    ex:q ex:b .\n`);
		});

		it('writes the run above a later value, moving it onto a line of its own when it shares one', () => {
			const twoLines = `ex:s ex:p ex:a,\n        ex:b .\n`;
			const oneLine = `ex:s ex:p ex:a, ex:b .\n`;

			expect(edit(twoLines, [{ op: 'setComment', at: { kind: 'value', at: valueOf(twoLines, 'p', 1) }, text: 'second' }]))
				.toBe(`ex:s ex:p ex:a,\n        # second\n        ex:b .\n`);
			expect(edit(oneLine, [{ op: 'setComment', at: { kind: 'value', at: valueOf(oneLine, 'p', 1) }, text: 'second' }]))
				.toBe(`ex:s ex:p ex:a,\n        # second\n        ex:b .\n`);
		});

		it('rewrites and removes a run closing the document', () => {
			const body = `ex:s ex:p ex:a .\n\n# one\n# two\n`;

			expect(edit(body, [{ op: 'setComment', at: { kind: 'document', index: 1 }, text: 'new' }])).toBe(`ex:s ex:p ex:a .\n\n# new\n`);
			expect(edit(body, [{ op: 'deleteComment', at: { kind: 'document', index: 0 } }])).toBe(`ex:s ex:p ex:a .\n`);
			expect(edit(body, [{ op: 'deleteComment', at: { kind: 'document', index: 2 } }])).toBe('rejected:notFound');
			expect(edit(`ex:s ex:p ex:a .\n\n# one\n\n# two\n`, [{ op: 'setComment', at: { kind: 'document', index: 1 }, text: 'new' }])).toBe(`ex:s ex:p ex:a .\n\n# one\n\n# new\n`);
		});

		it('removes the run above a resource with one blank line, and an empty text removes as well', () => {
			expect(edit(`# About s\n\nex:s ex:p ex:a .\n`, [{ op: 'deleteComment', at: { kind: 'resource', subject } }])).toBe(`ex:s ex:p ex:a .\n`);
			expect(edit(`# About s\nex:s ex:p ex:a .\n`, [{ op: 'setComment', at: { kind: 'resource', subject }, text: ' ' }])).toBe(`ex:s ex:p ex:a .\n`);
			expect(edit(`ex:s ex:p ex:a .\n`, [{ op: 'deleteComment', at: { kind: 'resource', subject } }])).toBe('rejected:notFound');
		});

		it('adds a comment block after a resource, before one, and at the end of the document', () => {
			const body = `ex:a ex:p ex:x .\n\nex:b ex:p ex:y .\n`;

			expect(edit(body, [{ op: 'addComment', after: iri('a'), text: 'between' }])).toBe(`ex:a ex:p ex:x .\n\n# between\n\nex:b ex:p ex:y .\n`);
			expect(edit(body, [{ op: 'addComment', before: iri('b'), text: 'between' }])).toBe(`ex:a ex:p ex:x .\n\n# between\n\nex:b ex:p ex:y .\n`);
			expect(edit(body, [{ op: 'addComment', text: 'the end\nof it' }])).toBe(`ex:a ex:p ex:x .\n\nex:b ex:p ex:y .\n\n# the end\n# of it\n`);
			expect(edit(body, [{ op: 'addComment', after: iri('missing'), text: 'x' }])).toBe('rejected:notFound');
		});

		it('focuses the written comment', () => {
			const plan = new EditSynthesizer(inputOf(`ex:s ex:p ex:a .\n`)).synthesize([{ op: 'addComment', after: subject, text: 'end' }]);

			expect(plan).toMatchObject({ focus: { target: 'comment' } });
		});
	});
});
