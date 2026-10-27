import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { RdfSyntax, TurtleLexer, TurtleParser, TurtleReader, assignBlankNodeIds } from '@faubulous/mentor-rdf-parsers';
import { EditOperation } from './edit-operation';
import { TermRef } from './term-ref';
import { EditRejectionError } from './edit-rejection';
import { EditSynthesizer } from './edit-synthesizer';
import { StatementTextParser } from './statement-text-parser';
import { PredicateGroup } from './statement-model';
import { SynthesisContext } from './synthesis-context';

const EX = 'http://example.org/';
const PREAMBLE = `@prefix ex: <${EX}> .\n`;
const subject: TermRef = { kind: 'iri', iri: `${EX}s` };

/**
 * The synthesis context of a Turtle body, with the operations of the action.
 */
function contextOf(body: string, operations: EditOperation[] = []): SynthesisContext {
	const text = PREAMBLE + body;
	const lexer = new TurtleLexer();

	lexer.blankNodeIdGenerator = undefined;

	const tokens = assignBlankNodeIds(lexer.tokenize(text).tokens);
	const quadContexts = new TurtleReader().readQuadContexts(new TurtleParser().parse(tokens), tokens);

	return new EditSynthesizer({ text, tokens, quadContexts, namespaces: { ex: EX }, syntax: RdfSyntax.Turtle, style: { tabSize: 4, insertSpaces: true } }).createContext(operations);
}

describe('StatementTextParser.parse', () => {
	it('reads the predicate and the objects as written', () => {
		const parsed = new StatementTextParser(contextOf(`ex:s ex:p ex:a .\n`)).parse(subject, 'ex:p "a, b"@en , ex:a');

		expect(parsed.predicateIri).toBe(`${EX}p`);
		expect(parsed.objects).toEqual(['"a, b"@en', 'ex:a']);
		expect(parsed.quads).toHaveLength(2);
		expect(parsed.subjectQuads).toHaveLength(2);
	});

	it('keeps nested nodes and lists as one object each, counting their statements', () => {
		const parsed = new StatementTextParser(contextOf(`ex:s ex:p ex:a .\n`)).parse(subject, 'ex:p [ ex:q "x" ; ex:r ( 1 2 ) ], ( ex:a )');

		expect(parsed.objects).toEqual(['[ ex:q "x" ; ex:r ( 1 2 ) ]', '( ex:a )']);
		expect(parsed.subjectQuads).toHaveLength(2);
		expect(parsed.quads).toHaveLength(2 + 2 + 4 + 2);
	});

	it('reads the type keyword and full IRIs', () => {
		const parsed = new StatementTextParser(contextOf(`ex:s ex:p ex:a .\n`)).parse(subject, `a <${EX}C>`);

		expect(parsed.predicateIri).toBe('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
		expect(parsed.objects).toEqual([`<${EX}C>`]);
	});

	it('knows a prefix declared in the same action', () => {
		const context = contextOf(`ex:s ex:p ex:a .\n`, [{ op: 'addNamespace', prefix: 'foaf', iri: 'http://xmlns.com/foaf/0.1/' }]);

		expect(new StatementTextParser(context).parse(subject, 'ex:p foaf:Person').subjectQuads[0].object.value).toBe('http://xmlns.com/foaf/0.1/Person');
		expect(() => new StatementTextParser(contextOf(`ex:s ex:p ex:a .\n`)).parse(subject, 'ex:p foaf:Person')).toThrow(EditRejectionError);
	});

	it('parses a statement of an anonymous blank node', () => {
		const context = contextOf(`ex:s ex:p [ ex:q "x" ] .\n`);
		const nested = context.model.quadContexts.find(quad => quad.predicate.value === `${EX}q`)!;

		expect(new StatementTextParser(context).parse({ kind: 'bnode', id: nested.subject.value }, 'ex:q "y"').objects).toEqual(['"y"']);
	});

	it('rejects text that does not parse or states other than one predicate', () => {
		const context = contextOf(`ex:s ex:p ex:a .\n`);

		expect(() => new StatementTextParser(context).parse(subject, 'ex:p "x')).toThrow(EditRejectionError);
		expect(() => new StatementTextParser(context).parse(subject, 'ex:p ex:a ; ex:q ex:b')).toThrow(EditRejectionError);
		expect(() => new StatementTextParser(context).parse(subject, 'ex:p ex:a . ex:t ex:q ex:b')).toThrow(EditRejectionError);
		expect(() => new StatementTextParser(context).parse(subject, '')).toThrow(EditRejectionError);
		expect(() => new StatementTextParser(context).parse(subject, 'ex:p ex:a # trailing')).toThrow(EditRejectionError);
	});
});

/**
 * The first predicate group of a Turtle body, with the context it was read in.
 */
function groupOf(body: string): { group: PredicateGroup; context: SynthesisContext } {
	const context = contextOf(body);

	return { group: context.model.blocks[0].groups[0], context };
}

describe('StatementTextParser.findHoles', () => {
	it('finds every spelling of a placeholder outside of string literals', () => {
		expect(StatementTextParser.findHoles('ex:p […], [...], [ ], [], "[…]", \'[]\', """ [ ] """').map(hole => hole.end - hole.start)).toEqual([3, 5, 3, 2]);
	});

	it('leaves a written blank node alone', () => {
		expect(StatementTextParser.findHoles('ex:p [ ex:q "x" ]')).toEqual([]);
	});
});

describe('StatementTextParser.spliceHoles', () => {
	it('replaces the placeholders with the blank nodes of the group, in order', () => {
		const { group, context } = groupOf(`ex:s ex:p [ ex:q "x" ], ex:a, [\n    ex:r 1 ] .\n`);
		const parser = new StatementTextParser(context);

		expect(parser.spliceHoles('ex:p [], ex:b, […]', group)).toBe('ex:p [ ex:q "x" ], ex:b, [\n    ex:r 1 ]');
		expect(parser.spliceHoles('ex:p [...], […]', group)).toBe('ex:p [ ex:q "x" ], [\n    ex:r 1 ]');
	});

	it('takes the blank nodes written inside a list along', () => {
		const { group, context } = groupOf(`ex:s ex:p ( ex:a [ ex:q "x" ] ) .\n`);

		expect(new StatementTextParser(context).spliceHoles('ex:p ( […] ex:a )', group)).toBe('ex:p ( [ ex:q "x" ] ex:a )');
	});

	it('drops every blank node when the text has no placeholder', () => {
		const { group, context } = groupOf(`ex:s ex:p [ ex:q "x" ], ex:a .\n`);

		expect(new StatementTextParser(context).spliceHoles('ex:p ex:a', group)).toBe('ex:p ex:a');
	});

	it('rejects more placeholders than blank nodes, and keeping some but not all of them', () => {
		const { group, context } = groupOf(`ex:s ex:p [ ex:q "x" ], [ ex:r 1 ] .\n`);
		const parser = new StatementTextParser(context);

		expect(() => parser.spliceHoles('ex:p [], [], []', group)).toThrow(EditRejectionError);
		expect(() => parser.spliceHoles('ex:p []', group)).toThrow(EditRejectionError);
	});
});
