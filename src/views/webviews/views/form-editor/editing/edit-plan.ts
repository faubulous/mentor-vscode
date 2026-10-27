import { FocusHint, TermRef } from '../form-editor-model';
import { TextEditSpec } from './text-edit-spec';
import { sortTextEdits } from './text-edit-applier';

/**
 * A term to look for when verifying an edit. Blank node identifiers are assigned per parse and
 * cannot be compared across the edit, so a blank node matches any blank node.
 */
export type TermPattern = TermRef | { kind: 'anyBlankNode' };

/**
 * How often a statement is expected to change between the text before and after an edit.
 */
export interface QuadExpectation {
	subject: TermPattern;
	predicate: string;
	object: TermPattern;
	/** The expected change of the number of matching statements. */
	delta: number;
}

/**
 * The items a collection must hold, in order, once the edit is applied.
 */
export interface CollectionOrderExpectation {
	/** The subject holding the collection. */
	parent: TermPattern;
	predicate: string;
	items: TermPattern[];
}

/**
 * Where the focus should go after the edit, relative to one of the plan's edits. The absolute
 * offset is only known once every edit of the plan is placed, see {@link resolveFocusOffset}.
 */
export interface FocusRequest {
	edit: TextEditSpec;
	/** The offset of the focused term within the inserted text of the edit. */
	offsetWithin: number;
	target: FocusHint['target'];
}

/**
 * The text edits an operation resolves to, together with what must hold once they are applied.
 */
export interface EditPlan {
	edits: TextEditSpec[];
	expectations: QuadExpectation[];
	/** The collections whose order the edit decides. */
	orderExpectations: CollectionOrderExpectation[];
	/** The expected change of the total number of statements. */
	quadCountDelta: number;
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
		expectations: plan.expectations ?? [],
		orderExpectations: plan.orderExpectations ?? [],
		quadCountDelta: plan.quadCountDelta ?? 0,
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
		merged.expectations.push(...plan.expectations);
		merged.orderExpectations.push(...plan.orderExpectations);
		merged.quadCountDelta += plan.quadCountDelta;
		merged.focus = plan.focus ?? merged.focus;
	}

	return merged;
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
