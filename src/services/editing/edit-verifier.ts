import { IToken, QuadContext } from '@faubulous/mentor-rdf-parsers';
import { applyTextEdits } from '@src/utilities/text-edits';
import { DocumentReader } from './document-reader';
import { EditPlan, ExpectedStatementChange } from './edit-plan';
import { SynthesisInput } from './synthesis-context';
import { getGraphKey, getGraphPatternKey, getPatternKey, getTermKey } from './term-patterns';

/**
 * The outcome of verifying a plan: the parsed result of the edited text, or why it is wrong.
 */
export type VerificationResult =
	| { ok: true; text: string; tokens: IToken[]; quadContexts: QuadContext[] }
	| { ok: false; message: string };

/**
 * Applies a plan to a copy of the document and checks that the result parses and changes
 * exactly the statements the plan set out to change: the statements of the document before and
 * after the edit are compared as a whole, so a statement the plan does not name may neither go,
 * nor appear, nor move to another graph. Blank nodes are compared as any blank node, as their
 * identifiers change when the edited text is read again. Nothing reaches the document unless
 * this passes.
 */
export class EditVerifier {
	/**
	 * Create a verifier for a document.
	 * @param _input The document the plans were synthesized against.
	 */
	constructor(private readonly _input: SynthesisInput) { }

	/**
	 * Verify a plan.
	 * @param plan The plan to verify.
	 * @returns The parsed result of the edited text, or why the plan is wrong.
	 */
	verify(plan: EditPlan): VerificationResult {
		const input = this._input;
		const text = applyTextEdits(input.text, plan.edits);
		const read = new DocumentReader(input.syntax).read(text);

		if (!read.ok) {
			return { ok: false, message: read.message.replace(/^The text/, 'The edited text') };
		}

		const problem = _changeProblem(input.quadContexts, read.quadContexts, plan.expectedChanges);

		return problem ? { ok: false, message: problem } : { ok: true, text, tokens: read.tokens, quadContexts: read.quadContexts };
	}
}

/**
 * Compare the change of the statements of a document with the change a plan expects, statement
 * by statement and graph by graph.
 * @param before The statements before the edit.
 * @param after The statements after the edit.
 * @param expectedChanges The changes the plan expects.
 * @returns Why the change differs, or `undefined` when it is the expected one.
 */
function _changeProblem(before: readonly QuadContext[], after: readonly QuadContext[], expectedChanges: readonly ExpectedStatementChange[]): string | undefined {
	const actual = new Map<string, number>();
	const expected = new Map<string, number>();

	_count(actual, before, -1);
	_count(actual, after, 1);

	for (const change of expectedChanges) {
		const key = _keyOf(getGraphPatternKey(change.graph), getPatternKey(change.subject), change.predicate, getPatternKey(change.object));

		expected.set(key, (expected.get(key) ?? 0) + change.delta);
	}

	for (const key of new Set([...actual.keys(), ...expected.keys()])) {
		const delta = actual.get(key) ?? 0;
		const planned = expected.get(key) ?? 0;

		if (delta !== planned) {
			return planned === 0
				? `The edit would change the statement ${_describe(key)}, which it should leave as it is.`
				: `The edit would change the statement ${_describe(key)} ${delta} times instead of ${planned}.`;
		}
	}

	return undefined;
}

/**
 * Count statements into the changes, by graph and statement.
 * @param changes The changes by key.
 * @param quadContexts The statements.
 * @param sign `-1` for the statements before the edit, `1` for those after it.
 */
function _count(changes: Map<string, number>, quadContexts: readonly QuadContext[], sign: number): void {
	for (const quad of quadContexts) {
		const key = _keyOf(getGraphKey(quad.graph), getTermKey(quad.subject), quad.predicate.value, getTermKey(quad.object));

		changes.set(key, (changes.get(key) ?? 0) + sign);
	}
}

/**
 * The key of a statement in a graph.
 * @param graph The key of the graph, empty for the default graph.
 * @param subject The key of the subject.
 * @param predicate The IRI of the predicate.
 * @param object The key of the object.
 * @returns The key.
 */
function _keyOf(graph: string, subject: string, predicate: string, object: string): string {
	return JSON.stringify([graph, subject, predicate, object]);
}

/**
 * Write a statement key for a message.
 * @param key The key.
 * @returns The statement as subject, predicate and object, with its graph when it has one.
 */
function _describe(key: string): string {
	const [graph, subject, predicate, object] = JSON.parse(key) as string[];

	return `'${subject} <${predicate}> ${object}'${graph ? ` in the graph ${graph}` : ''}`;
}
