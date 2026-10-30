/**
 * A row opened for a new statement of a card.
 */
export interface StatementDraft {
	/**
	 * The identifier of the draft, unique within its card.
	 */
	id: number;

	/**
	 * Whether the statement typed into the draft was handed to the host.
	 */
	submitted: boolean;
}

/**
 * The rows a card holds for new statements, after its properties: the one being typed into and
 * those handed to the host, which stay until the host shows their statements. Immutable: every
 * transition returns the next drafts, or the drafts themselves when nothing changes.
 */
export class StatementDrafts {
	/**
	 * No drafts.
	 */
	static readonly NONE = new StatementDrafts([], 1);

	/**
	 * Create the drafts.
	 * @param all The drafts, oldest first.
	 * @param _nextId The identifier the next draft takes.
	 */
	private constructor(readonly all: readonly StatementDraft[], private readonly _nextId: number) { }

	/**
	 * The draft a new statement can be typed into: the last one, while it was not submitted.
	 */
	get open(): StatementDraft | undefined {
		const last = this.all[this.all.length - 1];

		return last && !last.submitted ? last : undefined;
	}

	/**
	 * Open a draft after the others.
	 * @returns The next drafts.
	 */
	opened(): StatementDrafts {
		return new StatementDrafts([...this.all, { id: this._nextId, submitted: false }], this._nextId + 1);
	}

	/**
	 * Note that the statement of a draft was handed to the host.
	 * @param id The draft.
	 * @returns The next drafts.
	 */
	submitted(id: number): StatementDrafts {
		return new StatementDrafts(this.all.map(draft => draft.id === id ? { ...draft, submitted: true } : draft), this._nextId);
	}

	/**
	 * Drop the submitted drafts, once the host delivered the card again.
	 * @returns The next drafts, the drafts themselves when none was submitted.
	 */
	pruneSubmitted(): StatementDrafts {
		const kept = this.all.filter(draft => !draft.submitted);

		return kept.length === this.all.length ? this : new StatementDrafts(kept, this._nextId);
	}
}
