/**
 * How far the card of a resource is open: showing only its summary, all its statements without
 * editing, as in a read-only document, or the editor. Opening a card edits it; the form shows it
 * read only where the document cannot be edited.
 */
export type ResourceCardOpenState = 'collapsed' | 'readOnly' | 'edit';

/**
 * The state of one resource card. An open card stays open until its chevron collapses it.
 */
export interface ResourceCardState {
	/**
	 * How far the card is open.
	 */
	open: ResourceCardOpenState;
}

/**
 * The state of a card showing only its summary.
 */
const COLLAPSED_CARD: ResourceCardState = { open: 'collapsed' };

/**
 * The state of a card open for editing.
 */
const OPEN_CARD: ResourceCardState = { open: 'edit' };

/**
 * The states of the resource cards, by resource identifier. A card without an entry is collapsed.
 * Immutable: every transition returns the next states, or the states themselves when nothing
 * changes.
 */
export class ResourceCardStates {
	/**
	 * Every card collapsed.
	 */
	static readonly NONE = new ResourceCardStates({});

	/**
	 * Create the states.
	 * @param _states The states of the open cards, by resource identifier.
	 */
	constructor(private readonly _states: Readonly<Record<string, ResourceCardState>>) { }

	/**
	 * Build the states from the open cards of an earlier visit.
	 * @param openIds The identifiers of the cards that were open.
	 * @returns The states.
	 */
	static fromOpenIds(openIds: readonly string[]): ResourceCardStates {
		const states: Record<string, ResourceCardState> = {};

		for (const id of openIds) {
			states[id] = OPEN_CARD;
		}

		return new ResourceCardStates(states);
	}

	/**
	 * Get the state of a card, collapsed when it has none.
	 * @param id The resource identifier of the card.
	 * @returns The state.
	 */
	stateOf(id: string): ResourceCardState {
		return this._states[id] ?? COLLAPSED_CARD;
	}

	/**
	 * Get the identifiers of the open cards, which are remembered across reloads of the webview.
	 * @returns The identifiers.
	 */
	openIds(): string[] {
		return Object.keys(this._states).filter(id => this._states[id].open !== 'collapsed');
	}

	/**
	 * Open a collapsed card for editing, as a click on it or a resource just created does.
	 * @param id The resource identifier of the card.
	 * @returns The next states, the states themselves when the card is open already.
	 */
	open(id: string): ResourceCardStates {
		return this.stateOf(id).open === 'collapsed' ? this._with(id, OPEN_CARD) : this;
	}

	/**
	 * Collapse an open card, or open a collapsed one, as the corner chevron does.
	 * @param id The resource identifier of the card.
	 * @returns The next states.
	 */
	toggle(id: string): ResourceCardStates {
		return this._with(id, this.stateOf(id).open === 'collapsed' ? OPEN_CARD : COLLAPSED_CARD);
	}

	/**
	 * Collapse a card.
	 * @param id The resource identifier of the card.
	 * @returns The next states.
	 */
	collapse(id: string): ResourceCardStates {
		return this._with(id, COLLAPSED_CARD);
	}

	/**
	 * Replace the state of one card, dropping the entry of a collapsed card so the map holds only
	 * the open ones.
	 * @param id The resource identifier of the card.
	 * @param state The new state of the card.
	 * @returns The next states.
	 */
	private _with(id: string, state: ResourceCardState): ResourceCardStates {
		const states = { ...this._states };

		if (state.open === 'collapsed') {
			delete states[id];
		} else {
			states[id] = state;
		}

		return new ResourceCardStates(states);
	}
}
