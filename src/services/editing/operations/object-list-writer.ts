import { TextEditSpec, deleteRange } from '@src/utilities/text-edits';
import { isCommentToken } from '@src/utilities/tokens';
import { EditRejectionError } from '../edit-rejection';
import { ObjectSpan, PredicateGroup, SubjectBlock } from '../statement-model';
import { StatementValueWriter } from '../statement-value-writer';
import { SynthesisContext } from '../synthesis-context';
import { NewValue, ValueList, ValueListEntry, ValueListGroup } from '../value-list';
import { ValueOperations } from './value-operations';

/**
 * Writes an edit of the values of a predicate into a document that writes the objects of a
 * statement as a list, as Turtle, TriG and N3 do: values that go are cut out of their list with
 * their separator, new ones are written next to the value they follow or precede, separated as
 * the statement separates its objects, and a statement left without objects goes. Only a
 * statement whose objects change order is written anew. Comments in between stay.
 */
export class ObjectListWriter {
	/**
	 * Create a writer for one action.
	 * @param _context The shared state of the action.
	 * @param _list The resolved edit, with at least one statement of the predicate.
	 * @param _values Writes the new values.
	 */
	constructor(private readonly _context: SynthesisContext, private readonly _list: ValueList, private readonly _values: StatementValueWriter) { }

	/**
	 * Write the edit.
	 * @returns The edits.
	 * @throws {EditRejectionError} If a value cannot be written, objects with comments between them change order, or the subject would lose its last statement.
	 */
	write(): TextEditSpec[] {
		const edits: TextEditSpec[] = [];
		const insertions: TextEditSpec[] = [];
		const emptied = new Map<SubjectBlock, PredicateGroup[]>();

		for (const entry of this._list.groups) {
			if (entry.entries.length === 0) {
				emptied.set(entry.block, [...(emptied.get(entry.block) ?? []), entry.group]);
			} else if (entry.reordered) {
				insertions.push(this._rewrite(entry));
			} else {
				this._editInPlace(entry, edits, insertions);
			}
		}

		edits.push(...new ValueOperations(this._context).groupDeletions(emptied));

		return _mergeInsertions(edits, insertions);
	}

	/**
	 * Write the objects of a statement anew, in their new order, as an edit changing their order
	 * needs.
	 * @param entry The statement.
	 * @returns The insertion replacing its objects.
	 * @throws {EditRejectionError} If comments are written between the objects.
	 */
	private _rewrite(entry: ValueListGroup): TextEditSpec {
		const { model } = this._context;
		const objects = entry.group.objects;
		const start = objects[0].start;
		const end = objects[objects.length - 1].end;

		if (model.tokens.some(token => isCommentToken(token) && token.startOffset > start && token.startOffset < end)) {
			throw new EditRejectionError('unsupportedConstruct', 'Values with comments between them cannot change their order.');
		}

		const separator = this._separator(entry.block, entry.group);
		const texts = entry.entries.map(item => item.kind === 'kept' ? model.text.slice(item.span.start, item.span.end) : this._values.write(item.value));

		return { start, end, newText: texts.join(separator) };
	}

	/**
	 * Cut out the objects that go and write the new ones next to their neighbours, the objects that
	 * stay keeping their order.
	 * @param entry The statement.
	 * @param edits Collects the deletions.
	 * @param insertions Collects the insertions.
	 */
	private _editInPlace(entry: ValueListGroup, edits: TextEditSpec[], insertions: TextEditSpec[]): void {
		const { block, group } = entry;
		const separator = this._separator(block, group);
		const kept = entry.entries.flatMap(item => item.kind === 'kept' ? [item.span] : []);

		if (kept.length === 0) {
			insertions.push(this._replaceAll(group, _newValuesOf(entry.entries), separator, edits));

			return;
		}

		edits.push(...this._removedRunDeletions(group, entry.removed));

		_runsAroundKept(entry.entries).forEach(({ before, after, values }) => {
			const texts = values.map(value => this._values.write(value));

			if (before) {
				insertions.push({ start: before.start, end: before.start, newText: texts.join(separator) + separator });
			} else if (after) {
				insertions.push({ start: after.end, end: after.end, newText: separator + texts.join(separator) });
			}
		});
	}

	/**
	 * Replace all objects of a statement with new values, written where the first object was.
	 * @param group The statement.
	 * @param values The new values.
	 * @param separator The separator of the objects.
	 * @param edits Collects the deletions.
	 * @returns The insertion of the new values.
	 */
	private _replaceAll(group: PredicateGroup, values: readonly NewValue[], separator: string, edits: TextEditSpec[]): TextEditSpec {
		const { text, tokens } = this._context.model;
		const start = group.objects[0].start;
		const end = group.objects[group.objects.length - 1].end;

		edits.push(...deleteRange(text, tokens, start, end));

		return { start, end: start, newText: values.map(value => this._values.write(value)).join(separator) };
	}

	/**
	 * Cut out the runs of objects that go, each with the separator that joins it to the objects
	 * that stay: the one after a run when an object follows it, else the one before it.
	 * @param group The statement.
	 * @param removed The objects that go.
	 * @returns The deletions.
	 */
	private _removedRunDeletions(group: PredicateGroup, removed: readonly ObjectSpan[]): TextEditSpec[] {
		const { text, tokens } = this._context.model;
		const objects = group.objects;
		const deletions: TextEditSpec[] = [];
		let index = 0;

		while (index < objects.length) {
			if (!removed.includes(objects[index])) {
				index++;
				continue;
			}

			const first = index;

			while (index < objects.length && removed.includes(objects[index])) {
				index++;
			}

			const range = index < objects.length
				? { start: objects[first].start, end: objects[index].start }
				: { start: objects[first - 1].end, end: objects[index - 1].end };

			deletions.push(...deleteRange(text, tokens, range.start, range.end));
		}

		return deletions;
	}

	/**
	 * The text between two objects of a statement: a comma and a line break with the indentation of
	 * the objects where they are written one per line, else a comma and a space.
	 * @param block The block holding the statement.
	 * @param group The statement.
	 * @returns The separator.
	 */
	private _separator(block: SubjectBlock, group: PredicateGroup): string {
		const { style, styleDetector } = this._context;

		return styleDetector.objectsOnePerLine(group) ? `,${style.eol}${styleDetector.objectIndentFor(block, group)}` : ', ';
	}
}

/**
 * The new values among the entries of a statement.
 * @param entries The entries.
 * @returns The new values, in order.
 */
function _newValuesOf(entries: readonly ValueListEntry[]): NewValue[] {
	return entries.flatMap(entry => entry.kind === 'new' ? [entry.value] : []);
}

/**
 * Group the new values of a statement by the object that stays next to them: those before the
 * first object that stays are written before it, the others after the object they follow.
 * @param entries The entries of the statement, with at least one object that stays.
 * @returns The runs of new values with their neighbour.
 */
function _runsAroundKept(entries: readonly ValueListEntry[]): { before?: ObjectSpan; after?: ObjectSpan; values: NewValue[] }[] {
	const runs: { before?: ObjectSpan; after?: ObjectSpan; values: NewValue[] }[] = [];
	let previous: ObjectSpan | undefined;
	let pending: NewValue[] = [];

	for (const entry of entries) {
		if (entry.kind === 'new') {
			pending.push(entry.value);
			continue;
		}

		if (pending.length > 0) {
			runs.push(previous ? { after: previous, values: pending } : { before: entry.span, values: pending });
			pending = [];
		}

		previous = entry.span;
	}

	if (pending.length > 0) {
		runs.push({ after: previous, values: pending });
	}

	return runs;
}

/**
 * Combine the deletions and insertions of an edit. An insertion at the offset a deletion starts at
 * becomes the text of that deletion, as two edits may not start at the same offset.
 * @param edits The deletions.
 * @param insertions The insertions.
 * @returns The edits.
 */
function _mergeInsertions(edits: TextEditSpec[], insertions: readonly TextEditSpec[]): TextEditSpec[] {
	const merged = [...edits];

	for (const insertion of insertions) {
		const deletion = merged.find(edit => edit.start === insertion.start && edit !== insertion);

		if (deletion) {
			deletion.newText = insertion.newText + deletion.newText;
		} else {
			merged.push(insertion);
		}
	}

	return merged;
}
