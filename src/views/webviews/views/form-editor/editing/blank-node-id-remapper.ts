import { IToken, getBlankNodeIdFromToken } from '@faubulous/mentor-rdf-parsers';
import { TextEditSpec } from './text-edit-spec';
import { shiftOffset } from './text-edit-applier';

/**
 * Work out how an edit renumbered the blank nodes of a document. The parser assigns identifiers
 * in token order, so inserting a bracket early in the file renames every later node. A token
 * that survives the edit is found again at its shifted offset, and the two identifiers are paired.
 * @param before The tokens of the document before the edit.
 * @param after The tokens of the document after the edit.
 * @param edits The edits that were applied.
 * @returns The pairs of old and new identifiers that differ.
 */
export function remapBlankNodeIds(before: readonly IToken[], after: readonly IToken[], edits: readonly TextEditSpec[]): [string, string][] {
	const idsByOffset = new Map<number, string>();

	for (const token of after) {
		const id = getBlankNodeIdFromToken(token);

		if (id) {
			idsByOffset.set(token.startOffset, id);
		}
	}

	const renamed: [string, string][] = [];

	for (const token of before) {
		const oldId = getBlankNodeIdFromToken(token);

		if (!oldId) {
			continue;
		}

		const offset = shiftOffset(token.startOffset, edits);
		const newId = offset !== undefined ? idsByOffset.get(offset) : undefined;

		if (newId && newId !== oldId) {
			renamed.push([oldId, newId]);
		}
	}

	return renamed;
}
