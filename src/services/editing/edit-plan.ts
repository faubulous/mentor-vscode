import { Quad_Graph, Term } from '@rdfjs/types';
import { TextEditSpec } from '@src/utilities/text-edits';
import { getMatchKey } from './term-match-key';

/**
 * A change an edit is expected to make to the statements of the document, which the verifier
 * checks before the edit is applied: the number of statements matching a pattern of graph,
 * subject, predicate and object changes by `delta` between the text before and the text after the
 * edit.
 * Terms are matched by {@link getMatchKey}: exactly, except that a blank node matches any blank
 * node, as a blank node in a graph pattern does.
 */
export interface ExpectedStatementChange {
	/**
	 * The subject of the matching statements.
	 */
	subject: Term;

	/**
	 * The IRI of the predicate of the matching statements.
	 */
	predicate: string;

	/**
	 * The object of the matching statements.
	 */
	object: Term;

	/**
	 * The graph of the matching statements: where a removed statement was written, and where the
	 * edit writes a new one.
	 */
	graph: Quad_Graph;

	/**
	 * By how many the number of matching statements changes: `1` for a statement the edit
	 * writes, `-1` for one it removes, and so on for several. Changes of the same statement are
	 * added up, see {@link netExpectedChanges}, so a statement that is removed and written again
	 * expects no change.
	 */
	delta: number;
}

/**
 * The text edits an operation resolves to, together with what must hold once they are applied.
 */
export interface EditPlan {
	/**
	 * The text edits to apply.
	 */
	edits: TextEditSpec[];

	/**
	 * The changes the edits are expected to make to the statements, which the verifier checks.
	 */
	expectedChanges: ExpectedStatementChange[];
}

/**
 * Build a plan, filling in the fields an operation did not set.
 * @param plan The fields of the plan.
 * @returns The complete plan.
 */
export function createPlan(plan: Partial<EditPlan>): EditPlan {
	return {
		edits: plan.edits ?? [],
		expectedChanges: plan.expectedChanges ?? []
	};
}

/**
 * Combine the plans of several operations into the plan of one user action.
 * @param plans The plans to combine.
 * @returns The combined plan.
 */
export function mergePlans(plans: readonly EditPlan[]): EditPlan {
	const merged = createPlan({});

	for (const plan of plans) {
		merged.edits.push(...plan.edits);
		merged.expectedChanges.push(...plan.expectedChanges);
	}

	return merged;
}

/**
 * Add up the expected changes of the same statement, dropping those that net out, as those of a
 * value that goes and is written again do.
 * @param expectedChanges The expected changes.
 * @returns The net expected changes.
 */
export function netExpectedChanges(expectedChanges: readonly ExpectedStatementChange[]): ExpectedStatementChange[] {
	const net = new Map<string, ExpectedStatementChange>();

	for (const change of expectedChanges) {
		const key = JSON.stringify([getMatchKey(change.graph), getMatchKey(change.subject), change.predicate, getMatchKey(change.object)]);
		const existing = net.get(key);

		net.set(key, existing ? { ...existing, delta: existing.delta + change.delta } : change);
	}

	return Array.from(net.values()).filter(change => change.delta !== 0);
}

