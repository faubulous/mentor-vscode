/**
 * Whether the card of a resource shows only its summary or all its statements. The statements
 * are edited where the document can be written, and read otherwise.
 */
type ResourceCardOpenState = 'collapsed' | 'open';

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
 * The state of a card showing all its statements.
 */
const OPEN_CARD: ResourceCardState = { open: 'open' };

/**
 * The states of the resource cards, by the key of the card: the `termToString` form of its
 * resource. A card without an entry is collapsed.
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
	 * @param _states The states of the open cards, by key.
	 */
	constructor(private readonly _states: Readonly<Record<string, ResourceCardState>>) { }

	/**
	 * Build the states from the open cards of an earlier visit.
	 * @param openCards The keys of the cards that were open.
	 * @returns The states.
	 */
	static fromOpenCards(openCards: readonly string[]): ResourceCardStates {
		const states: Record<string, ResourceCardState> = {};

		for (const key of openCards) {
			states[key] = OPEN_CARD;
		}

		return new ResourceCardStates(states);
	}

	/**
	 * Get the state of a card, collapsed when it has none.
	 * @param key The key of the card.
	 * @returns The state.
	 */
	stateOf(key: string): ResourceCardState {
		return this._states[key] ?? COLLAPSED_CARD;
	}

	/**
	 * Get the keys of the open cards, which are remembered across reloads of the webview.
	 * @returns The keys.
	 */
	openCards(): string[] {
		return Object.keys(this._states).filter(key => this._states[key].open !== 'collapsed');
	}


	/**
	 * Collapse an open card, or open a collapsed one, as the corner chevron does.
	 * @param key The key of the card.
	 * @returns The next states.
	 */
	toggle(key: string): ResourceCardStates {
		return this._with(key, this.stateOf(key).open === 'collapsed' ? OPEN_CARD : COLLAPSED_CARD);
	}


	/**
	 * Carry the state of a card over to the key its resource has after a rename.
	 * @param key The key of the card before the rename.
	 * @param renamedKey The key of the card after the rename.
	 * @returns The next states.
	 */
	renamed(key: string, renamedKey: string): ResourceCardStates {
		return this._with(key, COLLAPSED_CARD)._with(renamedKey, this.stateOf(key));
	}

	/**
	 * Replace the state of one card, dropping the entry of a collapsed card so the map holds only
	 * the open ones.
	 * @param key The key of the card.
	 * @param state The new state of the card.
	 * @returns The next states.
	 */
	private _with(key: string, state: ResourceCardState): ResourceCardStates {
		const states = { ...this._states };

		if (state.open === 'collapsed') {
			delete states[key];
		} else {
			states[key] = state;
		}

		return new ResourceCardStates(states);
	}
}
