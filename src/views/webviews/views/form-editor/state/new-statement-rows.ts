import { StatementDraft } from './statement-draft';

/**
 * A row of a card a new statement is typed into.
 */
export interface NewStatementRow {
	/**
	 * The identifier of the row, unique within its card.
	 */
	id: number;

	/**
	 * The statement handed to the host from the row, which the row shows until the host does.
	 */
	submitted?: StatementDraft;
}

/**
 * The rows a card holds for new statements, after its properties: the one being typed into and
 * those handed to the host, which stay until the host shows their statements. Immutable: every
 * transition returns the next rows, or the rows themselves when nothing changes.
 */
export class NewStatementRows {
	/**
	 * No rows.
	 */
	static readonly NONE = new NewStatementRows([], 1);

	/**
	 * Create the rows.
	 * @param all The rows, oldest first.
	 * @param _nextId The identifier the next row takes.
	 */
	private constructor(readonly all: readonly NewStatementRow[], private readonly _nextId: number) { }

	/**
	 * The row a new statement can be typed into: the last one, while nothing was handed over from it.
	 */
	get open(): NewStatementRow | undefined {
		const last = this.all[this.all.length - 1];

		return last && !last.submitted ? last : undefined;
	}

	/**
	 * Open a row after the others.
	 * @returns The next rows.
	 */
	opened(): NewStatementRows {
		return new NewStatementRows([...this.all, { id: this._nextId }], this._nextId + 1);
	}

	/**
	 * Note that the statement of a row was handed to the host.
	 * @param id The row.
	 * @param statement The statement.
	 * @returns The next rows.
	 */
	submitted(id: number, statement: StatementDraft): NewStatementRows {
		return new NewStatementRows(this.all.map(row => row.id === id ? { ...row, submitted: statement } : row), this._nextId);
	}

	/**
	 * Drop the rows handed over, once the host delivered the card again.
	 * @returns The next rows, the rows themselves when none was handed over.
	 */
	pruneSubmitted(): NewStatementRows {
		const kept = this.all.filter(row => !row.submitted);

		return kept.length === this.all.length ? this : new NewStatementRows(kept, this._nextId);
	}
}
