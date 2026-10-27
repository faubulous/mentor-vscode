import { IToken, QuadContext } from '@faubulous/mentor-rdf-parsers';
import { applyTextEdits } from '@src/utilities/text-edits';
import { DocumentReader } from './document-reader';
import { EditPlan, QuadExpectation } from './edit-plan';
import { SynthesisInput } from './synthesis-context';
import { matchesTermPattern } from './term-patterns';

/**
 * The outcome of verifying a plan: the parsed result of the edited text, or why it is wrong.
 */
export type VerificationResult =
	| { ok: true; text: string; tokens: IToken[]; quadContexts: QuadContext[] }
	| { ok: false; message: string };

/**
 * Applies a plan to a copy of the document and checks that the result parses and changes
 * exactly the statements the plan set out to change. Nothing reaches the document unless this
 * passes.
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

		const { quadContexts } = read;
		const countDelta = quadContexts.length - input.quadContexts.length;

		if (countDelta !== plan.quadCountDelta) {
			return { ok: false, message: `The edit would change ${countDelta} statements instead of ${plan.quadCountDelta}.` };
		}

		for (const expectation of plan.expectations) {
			const delta = EditVerifier._count(quadContexts, expectation) - EditVerifier._count(input.quadContexts, expectation);

			if (delta !== expectation.delta) {
				return { ok: false, message: `The edit would change the statement '${expectation.predicate}' ${delta} times instead of ${expectation.delta}.` };
			}
		}

		return { ok: true, text, tokens: read.tokens, quadContexts };
	}

	/**
	 * Count the statements matching an expectation.
	 * @param quadContexts The statements to count in.
	 * @param expectation The expectation to match.
	 * @returns The number of matching statements.
	 */
	private static _count(quadContexts: readonly QuadContext[], expectation: QuadExpectation): number {
		return quadContexts.filter(
			quad => quad.predicate.value === expectation.predicate
				&& matchesTermPattern(quad.subject, expectation.subject)
				&& matchesTermPattern(quad.object, expectation.object)
		).length;
	}
}
