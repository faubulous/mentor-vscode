import { RDF } from '@faubulous/mentor-rdf';
import { statementsWithin } from '@src/utilities/quad-contexts';
import { QuadExpectation, TermPattern } from './edit-plan';
import { EditRejectionError } from './edit-rejection';
import { CollectionItemSpan } from './statement-model';
import { StatementValue } from './statement-value';
import { SynthesisContext } from './synthesis-context';
import { toPatternFromRef, toTermPattern } from './term-patterns';

/**
 * Writes the new values of an edit in the syntax of the document and tells which statements
 * they add. A new list writes the items of lists already written by their source text, so their
 * nested statements stay as they are.
 */
export class StatementValueWriter {
	/**
	 * Create a writer for one action.
	 * @param _context The shared state of the action.
	 * @param _items The items of the lists already written under the predicate, by their anchor.
	 */
	constructor(private readonly _context: SynthesisContext, private readonly _items: ReadonlyMap<number, CollectionItemSpan>) { }

	/**
	 * Write a new value.
	 * @param value The value.
	 * @returns The text of the value.
	 * @throws {EditRejectionError} If a term cannot be written, a list cannot be written in the syntax, or an item is not written in the document.
	 */
	write(value: StatementValue): string {
		switch (value.kind) {
			case 'term':
				return this._context.writer.writeObject(value.term);
			case 'list':
				return this._writeList(value.items);
			default:
				return this._itemText(value.anchor);
		}
	}

	/**
	 * How many statements a new value adds: the statement of the value, and for a list its chain
	 * and the nested statements of the items it takes over.
	 * @param value The value.
	 * @returns The number of statements.
	 */
	statementCountOf(value: StatementValue): number {
		return 1 + this._nestedCountOf(value);
	}

	/**
	 * The statements a new value adds, as expectations.
	 * @param subject The subject of the statement.
	 * @param predicate The predicate of the statement.
	 * @param value The value.
	 * @returns The expectations.
	 */
	expectationsOf(subject: TermPattern, predicate: string, value: StatementValue): QuadExpectation[] {
		return [{ subject, predicate, object: this._patternOf(value), delta: 1 }, ...this._nestedExpectationsOf(value)];
	}

	/**
	 * Write a list, which needs the abbreviations of Turtle.
	 * @param items The items.
	 * @returns The text of the list.
	 * @throws {EditRejectionError} If the syntax has no lists.
	 */
	private _writeList(items: readonly StatementValue[]): string {
		if (!this._context.writer.abbreviates) {
			throw new EditRejectionError('unsupportedSyntax', 'Lists cannot be written in this syntax.');
		}

		return items.length === 0 ? '( )' : `( ${items.map(item => this.write(item)).join(' ')} )`;
	}

	/**
	 * The source text of an item of a list already written.
	 * @param anchor The offset the item starts at.
	 * @returns The text.
	 * @throws {EditRejectionError} If no item starts at the offset.
	 */
	private _itemText(anchor: number): string {
		const item = this._item(anchor);

		return this._context.model.text.slice(item.start, item.end);
	}

	/**
	 * The pattern of the object a value is written as.
	 * @param value The value.
	 * @returns The pattern.
	 */
	private _patternOf(value: StatementValue): TermPattern {
		switch (value.kind) {
			case 'term':
				return toPatternFromRef(value.term);
			case 'list':
				return value.items.length === 0 ? { kind: 'iri', iri: RDF.nil } : { kind: 'anyBlankNode' };
			default:
				return toTermPattern(this._item(value.anchor).term);
		}
	}

	/**
	 * How many statements a value adds besides its own: the chain of a list with what its items
	 * add, and the statements nested in an item taken over.
	 * @param value The value.
	 * @returns The number of statements.
	 */
	private _nestedCountOf(value: StatementValue): number {
		switch (value.kind) {
			case 'term':
				return 0;
			case 'list':
				return value.items.reduce((sum, item) => sum + 2 + this._nestedCountOf(item), 0);
			default: {
				const item = this._item(value.anchor);

				return statementsWithin(this._context.model.quadContexts, item.start, item.end).length;
			}
		}
	}

	/**
	 * The statements a value adds besides its own, as expectations.
	 * @param value The value.
	 * @returns The expectations.
	 */
	private _nestedExpectationsOf(value: StatementValue): QuadExpectation[] {
		if (value.kind === 'term') {
			return [];
		}

		if (value.kind === 'existing') {
			const item = this._item(value.anchor);

			return statementsWithin(this._context.model.quadContexts, item.start, item.end).map(quad => ({
				subject: toTermPattern(quad.subject),
				predicate: quad.predicate.value,
				object: toTermPattern(quad.object),
				delta: 1
			}));
		}

		const node: TermPattern = { kind: 'anyBlankNode' };

		return value.items.flatMap((item, index) => [
			{ subject: node, predicate: RDF.first, object: this._patternOf(item), delta: 1 },
			{ subject: node, predicate: RDF.rest, object: index < value.items.length - 1 ? node : { kind: 'iri', iri: RDF.nil }, delta: 1 },
			...this._nestedExpectationsOf(item)
		]);
	}

	/**
	 * Find an item of a list already written.
	 * @param anchor The offset the item starts at.
	 * @returns The item.
	 * @throws {EditRejectionError} If no item starts at the offset.
	 */
	private _item(anchor: number): CollectionItemSpan {
		const item = this._items.get(anchor);

		if (!item) {
			throw new EditRejectionError('notFound', 'The list item is no longer at the place it was shown at.');
		}

		return item;
	}
}
