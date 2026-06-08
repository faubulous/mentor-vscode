/**
 * Immutably applies a mutation callback to `record[key]`.
 *
 * - If `mutate` returns a value, the entry is updated (or inserted).
 * - If `mutate` returns `undefined`, the entry is removed.
 * - All other entries are left untouched (referential equality preserved).
 *
 * Intended for use inside a React `setState` updater to apply an optimistic
 * local-state patch immediately before posting a message to the extension
 * host, so the UI reflects the change without waiting for the async round-trip.
 *
 * @param record - The record to patch.
 * @param key - Key of the entry to mutate.
 * @param mutate - Mutator applied to the current entry value (or `undefined` when absent).
 *                 Return a new value to update/insert, or `undefined` to delete.
 * @returns A new record with the mutation applied; the input is never modified.
 */
export function patchRecord<V>(
	record: Record<string, V>,
	key: string,
	mutate: (prev: V | undefined) => V | undefined,
): Record<string, V> {
	const next = mutate(record[key]);

	if (next === undefined) {
		const { [key]: _, ...rest } = record;
		return rest;
	} else {
		return { ...record, [key]: next };
	}
}

/**
 * Immutably applies a mutation callback to `outer[outerKey][innerKey]`.
 *
 * A two-level convenience wrapper around {@link patchRecord}: the outer slice
 * is patched first, then the inner key within that slice. The outer key is
 * always kept in the result (it is never deleted), even when the inner
 * mutation produces an empty slice.
 *
 * - If `mutate` returns a value, the inner entry is updated (or inserted).
 * - If `mutate` returns `undefined`, the inner entry is removed.
 * - All other entries at both levels are left untouched (referential equality preserved).
 *
 * Intended for use inside a React `setState` updater to apply an optimistic
 * local-state patch immediately before posting a message to the extension
 * host, so the UI reflects the change without waiting for the async round-trip.
 *
 * @param outer - The two-level nested record to patch.
 * @param outerKey - Key of the first-level slice to target.
 * @param innerKey - Key of the entry within that slice to mutate.
 * @param mutate - Mutator applied to the current inner entry value (or `undefined` when absent).
 *                 Return a new value to update/insert, or `undefined` to delete.
 * @returns A new record with the mutation applied; the input is never modified.
 */
export function patchNestedRecord<V>(
	outer: Record<string, Record<string, V>>,
	outerKey: string,
	innerKey: string,
	mutate: (prev: V | undefined) => V | undefined,
): Record<string, Record<string, V>> {
	return patchRecord<Record<string, V>>(outer, outerKey, slice =>
		patchRecord(slice ?? {}, innerKey, mutate),
	);
}
