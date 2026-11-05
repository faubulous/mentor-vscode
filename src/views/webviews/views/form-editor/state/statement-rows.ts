import { BlankNode, NamedNode } from '@rdfjs/types';
import { PropertyView } from '../form-editor-model';
import { TypedTermReader } from '../services/statement/typed-term-reader';
import { IEditingController } from './editing-controller.interface';
import { StatementDraft } from './statement-draft';
import { StatementRowData } from './statement-row-data';
import { StatementRowEditor } from './statement-row-editor';
import { StatementRowOwner } from './statement-row-owner';

/**
 * One row of a card: a property, edited when the card can write it, or a row a new statement is
 * typed into.
 */
export interface StatementRowEntry {
	/**
	 * The key the row is rendered by, which stays while the row lives.
	 */
	key: string;

	/**
	 * The property the row shows, or none for a row a new statement is typed into.
	 */
	property?: PropertyView;

	/**
	 * Edits the row; absent for a property the row only reads.
	 */
	editor?: StatementRowEditor;

	/**
	 * Whether the row leads the rows of its card, as the type of a blank node or the label of a
	 * resource does.
	 */
	isLeading?: boolean;
}

/**
 * What a card hands its rows each time it renders.
 */
export interface StatementRowsData {
	/**
	 * The resource of the rows.
	 */
	subject: NamedNode | BlankNode;

	/**
	 * The resource of the card of the list that shows the rows: the subject itself, or the card a
	 * nested blank node is shown in.
	 */
	card: NamedNode | BlankNode;

	/**
	 * The properties of the resource, in document order.
	 */
	properties: readonly PropertyView[];

	/**
	 * The document version the properties belong to.
	 */
	version: number;

	/**
	 * Whether the properties belong to an earlier version while the current one loads.
	 */
	stale: boolean;

	/**
	 * Reads what is typed, with the prefixes of the document.
	 */
	reader: TypedTermReader;

	/**
	 * Tells how the predicate of a property is written in its field.
	 */
	predicateTextOf: (property: PropertyView) => string;
}

/**
 * The row that leads the rows of a card: the property of the most preferred of some predicates,
 * such as the label predicates of a card of the list or the type of a nested card, or while the
 * resource has none of them, a row that stands in for it whose value writes the first of them.
 */
export interface LeadingRow {
	/**
	 * The IRIs of the predicates the row shows, most preferred first.
	 */
	predicates: readonly string[];

	/**
	 * How the predicate of the row that stands in is written.
	 */
	predicateText: string;
}

/**
 * How the rows of a card offer new statements.
 */
export interface StatementRowsOptions {
	/**
	 * Whether a row for a new statement is always open after the others, as in a card of the list;
	 * otherwise one is opened on request, as by Add property in the nested card of a blank node,
	 * and closes when it is left with nothing typed.
	 */
	keepNewRowOpen: boolean;

	/**
	 * The row that leads the rows, if one does.
	 */
	leadingRow?: LeadingRow;
}

/**
 * The statement rows of a card that can be written: a row per property, in document order, and
 * after them the rows for new statements. A row keeps its editor, and with it what was typed and
 * the focus, for as long as the card shows its predicate, found by the IRI of the predicate rather
 * than by its place; a row that wrote a new predicate or a new statement moves on to the property
 * of that predicate.
 */
export class StatementRows implements StatementRowOwner {
	private readonly _listeners = new Set<() => void>();

	private _editors: StatementRowEditor[] = [];

	private _notEditable = new Set<string>();

	private _nextId = 1;

	private _revision = 0;

	private _data?: StatementRowsData;

	private _leadingPlaceholder?: StatementRowEditor;

	/**
	 * Create the rows of a card.
	 * @param _editing Writes the rows.
	 * @param _options How the rows offer new statements.
	 */
	constructor(private readonly _editing: IEditingController, private readonly _options: StatementRowsOptions = { keepNewRowOpen: true }) { }

	/**
	 * How many times the rows changed outside of a render of the card.
	 */
	get revision(): number {
		return this._revision;
	}

	/**
	 * Subscribe to the changes of the rows outside of a render of the card: a row opened for a
	 * new statement, or one that went.
	 * @param listener Invoked on every change.
	 * @returns A function that removes the subscription.
	 */
	subscribe(listener: () => void): () => void {
		this._listeners.add(listener);

		return () => this._listeners.delete(listener);
	}

	/**
	 * Match the properties of the card with the rows, as the card renders: each editable property
	 * goes to the row that claims its predicate, else to the row that holds it, else to a new row.
	 * A row whose property went goes too, rows for new statements stay, and one is opened when none
	 * is waiting for a statement where one is always open.
	 * @param data The data of the card.
	 * @returns The rows in the order they are shown.
	 */
	reconcile(data: StatementRowsData): readonly StatementRowEntry[] {
		const unmatched = new Set(this._editors);
		const entries: StatementRowEntry[] = [];

		this._data = data;

		const leadingPredicate = this._leadingPredicateOf(data.properties);
		let leadingEntry: StatementRowEntry | undefined;

		this._notEditable = new Set();

		for (const property of data.properties) {
			const predicate = property.predicate.term.termType === 'NamedNode' ? property.predicate.term.value : '';

			if (!StatementDraft.canEdit(property)) {
				this._notEditable.add(predicate);
				entries.push({ key: `read-${predicate}`, property });
				continue;
			}

			const editor = this._editorFor(predicate, unmatched) ?? this._create({ ...data, property, predicateText: data.predicateTextOf(property) });

			unmatched.delete(editor);
			editor.deliver({ ...data, property, predicateText: data.predicateTextOf(property) });

			if (predicate === leadingPredicate) {
				leadingEntry = { key: `row-${editor.id}`, property, editor, isLeading: true };
			} else {
				entries.push({ key: `row-${editor.id}`, property, editor });
			}
		}

		for (const editor of unmatched) {
			if (!editor.isNew) {
				editor.retire();
			}
		}

		this._editors = this._editors.filter(editor => !unmatched.has(editor) || editor.isNew);

		for (const editor of this._editors.filter(current => current.isNew && current !== this._leadingPlaceholder)) {
			editor.deliver({ ...data, property: undefined, predicateText: editor.state.predicateText });
			entries.push({ key: `row-${editor.id}`, editor });
		}

		if (this._options.leadingRow) {
			entries.unshift(leadingEntry ?? this._leadingPlaceholderEntry(data, this._options.leadingRow));
		}

		if (this._options.keepNewRowOpen && !this._editors.some(editor => editor.isOpen && editor !== this._leadingPlaceholder)) {
			const editor = this._create({ ...data, property: undefined, predicateText: '' });

			entries.push({ key: `row-${editor.id}`, editor });
		}

		return entries;
	}

	rowOf(predicate: string): StatementRowEditor | 'notEditable' | undefined {
		if (this._notEditable.has(predicate)) {
			return 'notEditable';
		}

		return this._editors.find(editor => !editor.isNew && editor.state.stored.predicate === predicate);
	}

	submitted(): void {
		this._notify();
	}

	merged(row: StatementRowEditor): void {
		this._editors = this._editors.filter(editor => editor !== row);

		if (row === this._leadingPlaceholder) {
			this._leadingPlaceholder = undefined;
		}

		this._notify();
	}

	abandoned(row: StatementRowEditor): void {
		if (!this._options.keepNewRowOpen && row !== this._leadingPlaceholder) {
			this.merged(row);
		}
	}

	/**
	 * Open a row for a new statement after the others, or find the one that is open, as Add
	 * property does.
	 * @returns The row, or `undefined` before the card rendered its rows.
	 */
	addRow(): StatementRowEditor | undefined {
		const open = this._editors.find(editor => editor.isOpen && editor !== this._leadingPlaceholder);

		if (open || !this._data) {
			return open;
		}

		const editor = this._create({ ...this._data, property: undefined, predicateText: '' });

		this._notify();

		return editor;
	}

	/**
	 * The predicate of the property that leads the rows: the most preferred of the leading
	 * predicates the resource has.
	 * @param properties The properties of the resource.
	 * @returns The IRI of the predicate, or `undefined` when no row leads or the resource has none.
	 */
	private _leadingPredicateOf(properties: readonly PropertyView[]): string | undefined {
		const predicates = new Set(properties.flatMap(property => property.predicate.term.termType === 'NamedNode' ? [property.predicate.term.value] : []));

		return this._options.leadingRow?.predicates.find(predicate => predicates.has(predicate));
	}

	/**
	 * The row that stands in for the leading property while the resource has none: a row for a new
	 * statement of the first leading predicate, kept across renders. Once its value is written it
	 * claims the predicate, and the property it then holds replaces it; a placeholder the property
	 * arrived without goes.
	 * @param data The data of the card.
	 * @param leadingRow The leading predicates.
	 * @returns The row.
	 */
	private _leadingPlaceholderEntry(data: StatementRowsData, leadingRow: LeadingRow): StatementRowEntry {
		const placeholderData = { ...data, property: undefined, predicateText: leadingRow.predicateText, predicate: leadingRow.predicates[0] };
		const placeholder = this._leadingPlaceholder?.isNew ? this._leadingPlaceholder : this._create(placeholderData);

		this._leadingPlaceholder = placeholder;
		placeholder.deliver(placeholderData);

		return { key: `row-${placeholder.id}`, editor: placeholder, isLeading: true };
	}

	/**
	 * Find the row a property of a predicate goes to: the row that claims the predicate, else the
	 * row that holds it, which it still does while it waits for the property it claims.
	 * @param predicate The IRI of the predicate.
	 * @param candidates The rows not matched yet.
	 * @returns The row, or `undefined` when no row is the predicate's.
	 */
	private _editorFor(predicate: string, candidates: ReadonlySet<StatementRowEditor>): StatementRowEditor | undefined {
		const rows = Array.from(candidates);

		return rows.find(editor => editor.claimedPredicate === predicate)
			?? rows.find(editor => !editor.isNew && editor.state.stored.predicate === predicate);
	}

	/**
	 * Add a row.
	 * @param data The data of the row.
	 * @returns The editor of the row.
	 */
	private _create(data: StatementRowData): StatementRowEditor {
		const editor = new StatementRowEditor(this._nextId++, this._editing, this, data);

		this._editors.push(editor);

		return editor;
	}

	/**
	 * Tell the subscribers of a change.
	 */
	private _notify(): void {
		this._revision++;

		for (const listener of this._listeners) {
			listener();
		}
	}
}
