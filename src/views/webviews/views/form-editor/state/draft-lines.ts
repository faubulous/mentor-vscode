import { ResourceDetail } from '../form-editor-model';
import { DraftLine } from './draft-line';

/**
 * Where a draft is placed among the rows of its card.
 */
export interface DraftPlacement {
	/**
	 * The key of the row the draft follows.
	 */
	afterKey?: string;

	/**
	 * The key of the row the draft precedes, when it does not follow one.
	 */
	beforeKey?: string;
}

/**
 * The draft lines of a card, in the order they were opened. Changes return a new instance, or
 * the same one when nothing changed.
 */
export class DraftLines {
	/**
	 * No drafts.
	 */
	static readonly NONE = new DraftLines([], 1);

	/**
	 * Create the drafts.
	 * @param all The drafts.
	 * @param _nextId The identifier the next draft takes.
	 */
	private constructor(readonly all: readonly DraftLine[], private readonly _nextId: number) { }

	/**
	 * The draft opened last.
	 */
	get newest(): DraftLine | undefined {
		return this.all[this.all.length - 1];
	}

	/**
	 * Open a draft.
	 * @param placement Where the draft is placed.
	 * @returns The drafts with the new one, which is the newest.
	 */
	open(placement: DraftPlacement = {}): DraftLines {
		return new DraftLines([...this.all, { id: this._nextId, ...placement }], this._nextId + 1);
	}

	/**
	 * Record what a draft was committed with, so it stays until the host shows the statement.
	 * @param id The draft.
	 * @param text The committed text.
	 * @param predicate The predicate IRI the text states.
	 * @param statedBefore Whether the resource stated the predicate already.
	 * @returns The drafts with the commit recorded.
	 */
	committed(id: number, text: string, predicate: string, statedBefore: boolean): DraftLines {
		return new DraftLines(this.all.map(draft => draft.id === id ? { ...draft, committed: text, predicate, statedBefore } : draft), this._nextId);
	}

	/**
	 * Close a draft.
	 * @param id The draft.
	 * @returns The drafts without it.
	 */
	without(id: number): DraftLines {
		const kept = this.all.filter(draft => draft.id !== id);

		return kept.length === this.all.length ? this : new DraftLines(kept, this._nextId);
	}

	/**
	 * Drop the committed drafts whose statement the host has delivered: their predicate is
	 * stated now and was not when they were committed.
	 * @param detail The resource as the host shows it.
	 * @returns The drafts still open, the same instance when nothing was dropped.
	 */
	prune(detail: ResourceDetail): DraftLines {
		const stated = new Set(detail.properties.map(property => property.predicate.term.kind === 'iri' ? property.predicate.term.iri : ''));
		const kept = this.all.filter(draft => draft.committed === undefined || draft.predicate === undefined || draft.statedBefore || !stated.has(draft.predicate));

		return kept.length === this.all.length ? this : new DraftLines(kept, this._nextId);
	}
}
