import { EditRejectionError } from './edit-rejection';
import { CollectionItemSpan, ObjectSpan, PredicateGroup, StatementModel, SubjectBlock } from './statement-model';
import { StatementLocator } from './statement-locator';
import { StatementValue } from './statement-value';
import { TermRef } from './term-ref';
import { NewValue, ValueList, ValueListEntry, ValueListGroup } from './value-list';

/**
 * An object written under the predicate, with the statement it belongs to.
 */
interface WrittenObject {
	/**
	 * The object.
	 */
	span: ObjectSpan;

	/**
	 * The index of its statement among the statements of the predicate.
	 */
	groupIndex: number;
}

/**
 * Works out what an edit of the values of a predicate does to the statements that write them:
 * which written values stay, which go, and where each new value is written.
 */
export class ValueListResolver {
	/**
	 * Create a resolver for a document.
	 * @param _model The statement model of the document.
	 */
	constructor(private readonly _model: StatementModel) { }

	/**
	 * Resolve the values of an edit against the statements of a predicate.
	 * @param subject The subject.
	 * @param predicate The IRI of the predicate.
	 * @param values The values the predicate is to have, at least one.
	 * @returns What the edit does to each statement of the predicate.
	 * @throws {EditRejectionError} If a value refers to nothing written under the predicate, is listed twice, or would move between statements.
	 */
	resolve(subject: TermRef, predicate: string, values: readonly StatementValue[]): ValueList {
		const located = this._locate(subject, predicate);
		const items = this._itemsOf(located);
		const objects = new Map(located.flatMap(({ group }, groupIndex) => group.objects.map(span => [span.start, { span, groupIndex }] as const)));

		_requireListedOnce(values);

		if (located.length === 0) {
			return { groups: [], added: values.map(value => _requireNew(value, 'The value is no longer at the place it was shown at.')), items };
		}

		const entries = this._place(values, objects, located.length);

		return { groups: located.map(({ block, group }, index) => _toValueListGroup(block, group, entries[index])), added: [], items };
	}

	/**
	 * Find the statements of the predicate in the blocks of the subject, in document order.
	 * @param subject The subject.
	 * @param predicate The IRI of the predicate.
	 * @returns The statements with the blocks holding them.
	 * @throws {EditRejectionError} If the subject is not described in the document.
	 */
	private _locate(subject: TermRef, predicate: string): { block: SubjectBlock; group: PredicateGroup }[] {
		return new StatementLocator(this._model).blocksOf(subject).flatMap(block => block.groups.filter(group => group.predicateIri === predicate).map(group => ({ block, group })));
	}

	/**
	 * Collect the items of the lists written under the predicate, nested lists included.
	 * @param located The statements of the predicate.
	 * @returns The items by the offset they start at.
	 */
	private _itemsOf(located: readonly { group: PredicateGroup }[]): Map<number, CollectionItemSpan> {
		const spans = located.flatMap(({ group }) => group.objects);
		const items = new Map<number, CollectionItemSpan>();

		for (const collection of this._model.collections.values()) {
			for (const item of collection) {
				if (spans.some(span => item.start >= span.start && item.end <= span.end)) {
					items.set(item.start, item);
				}
			}
		}

		return items;
	}

	/**
	 * Place the values among the statements: a written value stays in its statement, and a new one
	 * goes after the written value listed before it, else before the one listed after it, else in
	 * the place of the first value that goes.
	 * @param values The values.
	 * @param objects The objects written under the predicate, by their anchor.
	 * @param groupCount The number of statements of the predicate.
	 * @returns The entries of every statement, in order.
	 * @throws {EditRejectionError} If a written value is not one of the predicate, or the values would move between statements.
	 */
	private _place(values: readonly StatementValue[], objects: ReadonlyMap<number, WrittenObject>, groupCount: number): ValueListEntry[][] {
		const entries: ValueListEntry[][] = Array.from({ length: groupCount }, () => []);
		const leading: ValueListEntry[] = [];
		let previous: WrittenObject | undefined;

		for (const value of values) {
			if (value.kind !== 'existing') {
				(previous ? entries[previous.groupIndex] : leading).push({ kind: 'new', value });
				continue;
			}

			const written = objects.get(value.anchor);

			if (!written) {
				throw new EditRejectionError('notFound', 'The value is no longer at the place it was shown at.');
			}

			if (previous && written.groupIndex < previous.groupIndex) {
				throw new EditRejectionError('unsupportedConstruct', 'Values written in separate statements keep their order.');
			}

			entries[written.groupIndex].push(...(previous ? [] : leading.splice(0)), { kind: 'kept', span: written.span });
			previous = written;
		}

		// Nothing stays: the new values take the place of the values of the first statement.
		entries[0].push(...leading);

		return entries;
	}
}

/**
 * Make what an edit leaves of a statement.
 * @param block The block holding the statement.
 * @param group The statement.
 * @param entries The objects it holds after the edit.
 * @returns The statement with its entries, removed objects and whether they change order.
 */
function _toValueListGroup(block: SubjectBlock, group: PredicateGroup, entries: ValueListEntry[]): ValueListGroup {
	const kept = entries.flatMap(entry => entry.kind === 'kept' ? [entry.span] : []);
	const removed = group.objects.filter(span => !kept.includes(span));
	const inDocumentOrder = group.objects.filter(span => kept.includes(span));

	return { block, group, entries, removed, reordered: kept.some((span, index) => span !== inDocumentOrder[index]) };
}

/**
 * Require every written value to be listed once at most, as a value or as an item of a list.
 * @param values The values.
 * @throws {EditRejectionError} If a written value is listed twice.
 */
function _requireListedOnce(values: readonly StatementValue[]): void {
	const anchors = new Set<number>();

	const visit = (value: StatementValue): void => {
		if (value.kind === 'list') {
			value.items.forEach(visit);
		} else if (value.kind === 'existing') {
			if (anchors.has(value.anchor)) {
				throw new EditRejectionError('invalidTerm', 'A value is listed twice.');
			}

			anchors.add(value.anchor);
		}
	};

	values.forEach(visit);
}

/**
 * Require a value to be new, as every value of a predicate the subject does not carry is.
 * @param value The value.
 * @param message Why a written value is refused.
 * @returns The value.
 * @throws {EditRejectionError} If the value refers to a written one.
 */
function _requireNew(value: StatementValue, message: string): NewValue {
	if (value.kind === 'existing') {
		throw new EditRejectionError('notFound', message);
	}

	return value;
}
