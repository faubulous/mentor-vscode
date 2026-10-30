import { TextEditSpec, sortTextEdits } from '@src/utilities/text-edits';
import { TermRef } from './term-ref';

/**
 * A term to look for when verifying an edit. Blank node identifiers are assigned per parse and
 * cannot be compared across the edit, so a blank node matches any blank node.
 */
export type TermPattern = TermRef | { kind: 'anyBlankNode' };

/**
 * A change an edit is expected to make to the statements of the document, which the verifier
 * checks before the edit is applied: the number of statements matching a pattern of subject,
 * predicate and object changes by `delta` between the text before and the text after the edit.
 * Terms are matched exactly, except blank nodes, whose identifiers change when the edited text is
 * read again, so any blank node matches.
 */
export interface ExpectedStatementChange {
	/**
	 * The subject of the matching statements.
	 */
	subject: TermPattern;

	/**
	 * The IRI of the predicate of the matching statements.
	 */
	predicate: string;

	/**
	 * The object of the matching statements.
	 */
	object: TermPattern;

	/**
	 * By how many the number of matching statements changes: `1` for a statement the edit
	 * writes, `-1` for one it removes, and so on for several. Changes of the same statement are
	 * added up, see {@link netExpectedChanges}, so a statement that is removed and written again
	 * expects no change.
	 */
	delta: number;
}

/**
 * Which cell of a row the focus goes to after an edit.
 */
export type FocusTarget = 'subject' | 'predicate' | 'value' | 'addProperty' | 'comment';

/**
 * Where the focus should go after the edit, relative to one of the plan's edits. The absolute
 * offset is only known once every edit of the plan is placed, see {@link resolveFocusOffset}.
 */
export interface FocusRequest {
	/**
	 * The edit the focus is relative to.
	 */
	edit: TextEditSpec;

	/**
	 * The offset of the focused term within the inserted text of the edit.
	 */
	offsetWithin: number;
	/**
	 * Which cell of the row the focus goes to.
	 */
	target: FocusTarget;
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

	/**
	 * Where the focus should go afterwards, when the operation decides it.
	 */
	focus?: FocusRequest;
}

/**
 * Build a plan, filling in the fields an operation did not set.
 * @param plan The fields of the plan.
 * @returns The complete plan.
 */
export function createPlan(plan: Partial<EditPlan>): EditPlan {
	return {
		edits: plan.edits ?? [],
		expectedChanges: plan.expectedChanges ?? [],
		focus: plan.focus
	};
}

/**
 * Combine the plans of several operations into the plan of one user action. The focus of the
 * last operation that requests one wins, so a bundled prefix declaration does not steal the
 * focus from the value it was declared for.
 * @param plans The plans to combine.
 * @returns The combined plan.
 */
export function mergePlans(plans: readonly EditPlan[]): EditPlan {
	const merged = createPlan({});

	for (const plan of plans) {
		merged.edits.push(...plan.edits);
		merged.expectedChanges.push(...plan.expectedChanges);
		merged.focus = plan.focus ?? merged.focus;
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
		const key = JSON.stringify([change.subject, change.predicate, change.object]);
		const existing = net.get(key);

		net.set(key, existing ? { ...existing, delta: existing.delta + change.delta } : change);
	}

	return Array.from(net.values()).filter(change => change.delta !== 0);
}

/**
 * Resolve the focus of a plan to an offset in the edited text.
 * @param plan The plan whose focus to resolve.
 * @returns The offset in the edited text, or `undefined` if the plan requests no focus.
 */
export function resolveFocusOffset(plan: EditPlan): number | undefined {
	const focus = plan.focus;

	if (!focus) {
		return undefined;
	}

	let shift = 0;

	for (const edit of sortTextEdits(plan.edits)) {
		if (edit === focus.edit) {
			return edit.start + shift + focus.offsetWithin;
		}

		shift += edit.newText.length - (edit.end - edit.start);
	}

	return undefined;
}
