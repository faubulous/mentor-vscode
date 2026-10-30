import { IToken, QuadContext } from '@faubulous/mentor-rdf-parsers';
import { applyTextEdits } from '@src/utilities/text-edits';
import { DocumentReader } from './document-reader';
import { EditPlan, ExpectedStatementChange } from './edit-plan';
import { SynthesisInput } from './synthesis-context';
import { getPatternKey, getTermKey } from './term-patterns';

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
 * Compare the change of the statements of a document with the change a plan expects.
 * @param before The statements before the edit.
 * @param after The statements after the edit.
 * @param expectedChanges The changes the plan expects.
 * @returns Why the change differs, or `undefined` when it is the expected one.
 */
function _changeProblem(before: readonly QuadContext[], after: readonly QuadContext[], expectedChanges: readonly ExpectedStatementChange[]): string | undefined {
	const changes = new Map<string, { statement: string; delta: number }>();

	_count(changes, before, -1);
	_count(changes, after, 1);

	const expected = new Map<string, number>();

	for (const change of expectedChanges) {
		const statement = JSON.stringify([getPatternKey(change.subject), change.predicate, getPatternKey(change.object)]);

		expected.set(statement, (expected.get(statement) ?? 0) + change.delta);
	}

	const actual = new Map<string, number>();

	for (const { statement, delta } of changes.values()) {
		if (delta !== 0) {
			if (!expected.has(statement)) {
				return `The edit would change the statement ${_describe(statement)}, which it should leave as it is.`;
			}

			actual.set(statement, (actual.get(statement) ?? 0) + delta);
		}
	}

	for (const [statement, delta] of expected) {
		if ((actual.get(statement) ?? 0) !== delta) {
			return `The edit would change the statement ${_describe(statement)} ${actual.get(statement) ?? 0} times instead of ${delta}.`;
		}
	}

	return undefined;
}

/**
 * Count statements into the changes, by graph and statement.
 * @param changes The changes, by graph and statement.
 * @param quadContexts The statements.
 * @param sign `-1` for the statements before the edit, `1` for those after it.
 */
function _count(changes: Map<string, { statement: string; delta: number }>, quadContexts: readonly QuadContext[], sign: number): void {
	for (const quad of quadContexts) {
		const statement = JSON.stringify([getTermKey(quad.subject), quad.predicate.value, getTermKey(quad.object)]);
		const key = JSON.stringify([quad.graph.termType === 'DefaultGraph' ? '' : getTermKey(quad.graph), statement]);
		const entry = changes.get(key);

		if (entry) {
			entry.delta += sign;
		} else {
			changes.set(key, { statement, delta: sign });
		}
	}
}

/**
 * Write a statement key for a message.
 * @param statement The key.
 * @returns The statement as subject, predicate and object.
 */
function _describe(statement: string): string {
	const [subject, predicate, object] = JSON.parse(statement) as string[];

	return `'${subject} <${predicate}> ${object}'`;
}
