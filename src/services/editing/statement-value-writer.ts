import { RDF } from '@faubulous/mentor-rdf';
import { statementsWithin } from '@src/utilities/quad-contexts';
import { Quad_Graph, Term } from '@rdfjs/types';
import { ExpectedStatementChange } from './edit-plan';
import { EditRejectionError } from './edit-rejection';
import { CollectionItemSpan, ObjectSpan, TokenSpan } from './statement-model';
import { StatementValue } from './statement-value';
import { SynthesisContext } from './synthesis-context';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

/**
 * Writes the new values of an edit in the syntax of the document and tells which statements
 * they add. A new list writes the items of lists already written by their source text, so their
 * nested statements stay as they are; a copy writes the source text of a written value again.
 */
export class StatementValueWriter {
	/**
	 * Create a writer for one action.
	 * @param _context The shared state of the action.
	 * @param _items The items of the lists already written under the predicate, by their anchor.
	 * @param _written The values written under the predicate and the items of their lists, by their anchor.
	 */
	constructor(
		private readonly _context: SynthesisContext,
		private readonly _items: ReadonlyMap<number, CollectionItemSpan>,
		private readonly _written: ReadonlyMap<number, CollectionItemSpan | ObjectSpan>
	) { }

	/**
	 * Write a new value.
	 * @param value The value.
	 * @returns The text of the value.
	 * @throws {EditRejectionError} If a term cannot be written, a list or a node cannot be written in the syntax, or a value referred to is not written in the document.
	 */
	write(value: StatementValue): string {
		switch (value.kind) {
			case 'term':
				return this._context.writer.writeObject(value.term);
			case 'list':
				return this._writeList(value.items);
			case 'node':
				return this._writeNode(value.statements);
			case 'copy':
				return this._textOf(this._writtenValue(value.anchor));
			default:
				return this._textOf(this._item(value.anchor));
		}
	}

	/**
	 * The statements a new value adds, as expected changes, all in the graph it is written in: a
	 * list or a value taken over is written there whole.
	 * @param graph The graph the value is written in.
	 * @param subject The subject of the statement.
	 * @param predicate The predicate of the statement.
	 * @param value The value.
	 * @returns The expected changes.
	 */
	expectedChangesOf(graph: Quad_Graph, subject: Term, predicate: string, value: StatementValue): ExpectedStatementChange[] {
		return [{ subject, predicate, object: this._objectOf(value), graph, delta: 1 }, ...this._nestedChangesOf(graph, value)];
	}

	/**
	 * Write a list, which needs the abbreviations of Turtle.
	 * @param items The items.
	 * @returns The text of the list.
	 * @throws {EditRejectionError} If the syntax has no lists.
	 */
	private _writeList(items: readonly StatementValue[]): string {
		if (!this._context.writer.abbreviates) {
			throw new EditRejectionError({ kind: 'listsNotSupported' });
		}

		return items.length === 0 ? '( )' : `( ${items.map(item => this.write(item)).join(' ')} )`;
	}

	/**
	 * Write an anonymous blank node with its statements, which needs the abbreviations of Turtle.
	 * @param statements The statements of the node.
	 * @returns The text of the node.
	 * @throws {EditRejectionError} If the syntax has no anonymous blank nodes written in place.
	 */
	private _writeNode(statements: readonly { predicate: string; values: StatementValue[] }[]): string {
		if (!this._context.writer.abbreviates) {
			throw new EditRejectionError({ kind: 'nodesNotSupported' });
		}

		const written = statements.map(({ predicate, values }) => `${this._context.writer.writePredicate(predicate)} ${values.map(value => this.write(value)).join(', ')}`);

		return written.length === 0 ? '[ ]' : `[ ${written.join(' ; ')} ]`;
	}

	/**
	 * The source text of a written value.
	 * @param span Where the value is written.
	 * @returns The text.
	 */
	private _textOf(span: TokenSpan): string {
		return this._context.model.text.slice(span.start, span.end);
	}

	/**
	 * The object a value is written as. A list is written as a new blank node, whose identifier
	 * is only known once the text is read again; the verifier matches it as any blank node.
	 * @param value The value.
	 * @returns The object.
	 */
	private _objectOf(value: StatementValue): Term {
		switch (value.kind) {
			case 'term':
				return value.term;
			case 'list':
				return value.items.length === 0 ? RdfDataFactory.namedNode(RDF.nil) : RdfDataFactory.blankNode();
			case 'node':
				return RdfDataFactory.blankNode();
			case 'copy':
				return this._copiedObjectOf(this._writtenValue(value.anchor).quad.object);
			default:
				return this._item(value.anchor).term;
		}
	}

	/**
	 * The object a copy of a written object is read as: a blank node written in place is read as a
	 * new one.
	 * @param object The written object.
	 * @returns The object of the copy.
	 */
	private _copiedObjectOf(object: Term): Term {
		return object.termType === 'BlankNode' ? RdfDataFactory.blankNode() : object;
	}

	/**
	 * The statements a value adds besides its own, as expected changes.
	 * @param graph The graph the value is written in.
	 * @param value The value.
	 * @returns The expected changes.
	 */
	private _nestedChangesOf(graph: Quad_Graph, value: StatementValue): ExpectedStatementChange[] {
		if (value.kind === 'term') {
			return [];
		}

		if (value.kind === 'existing' || value.kind === 'copy') {
			const span = value.kind === 'existing' ? this._item(value.anchor) : this._writtenValue(value.anchor);

			return statementsWithin(this._context.model.quadContexts, span.start, span.end).map(quad => ({
				subject: quad.subject,
				predicate: quad.predicate.value,
				object: quad.object,
				graph,
				delta: 1
			}));
		}

		const node = RdfDataFactory.blankNode();

		if (value.kind === 'node') {
			return value.statements.flatMap(({ predicate, values }) => values.flatMap(item => [
				{ subject: node, predicate, object: this._objectOf(item), graph, delta: 1 },
				...this._nestedChangesOf(graph, item)
			]));
		}


		return value.items.flatMap((item, index) => [
			{ subject: node, predicate: RDF.first, object: this._objectOf(item), graph, delta: 1 },
			{ subject: node, predicate: RDF.rest, object: index < value.items.length - 1 ? node : RdfDataFactory.namedNode(RDF.nil), graph, delta: 1 },
			...this._nestedChangesOf(graph, item)
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
			throw new EditRejectionError({ kind: 'valueMoved' });
		}

		return item;
	}

	/**
	 * Find a value written under the predicate, or an item of a list written there.
	 * @param anchor The offset the value starts at.
	 * @returns Where the value is written.
	 * @throws {EditRejectionError} If no value starts at the offset.
	 */
	private _writtenValue(anchor: number): CollectionItemSpan | ObjectSpan {
		const value = this._written.get(anchor);

		if (!value) {
			throw new EditRejectionError({ kind: 'valueMoved' });
		}

		return value;
	}
}
