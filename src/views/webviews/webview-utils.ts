/**
 * Immutably applies `mut` to `outer[outerKey][innerKey]`.
 *
 * - If `mut` returns a value, the entry is updated (or inserted).
 * - If `mut` returns `undefined`, the entry is removed.
 * - All other entries are left untouched (referential equality preserved).
 *
 * Intended for use inside a React `setState` updater to apply an optimistic
 * local-state patch immediately before posting a message to the extension
 * host, so the UI reflects the change without waiting for the async round-trip.
 *
 * @param outer - The two-level nested record to patch.
 * @param outerKey - Key of the first-level slice to target.
 * @param innerKey - Key of the entry within that slice to mutate.
 * @param mut - Mutator applied to the current entry value (or `undefined` when absent).
 *              Return a new value to update/insert, or `undefined` to delete.
 * @returns A new record with the mutation applied; the input is never modified.
 */
export function patchNestedRecord<V>(
	outer: Record<string, Record<string, V>>,
	outerKey: string,
	innerKey: string,
	mut: (prev: V | undefined) => V | undefined,
): Record<string, Record<string, V>> {
	const slice = outer[outerKey] ?? {};
	const next = mut(slice[innerKey]);

	if (next === undefined) {
		const { [innerKey]: _, ...rest } = slice;
		return { ...outer, [outerKey]: rest };
	} else {
		return { ...outer, [outerKey]: { ...slice, [innerKey]: next } };
	}
}
