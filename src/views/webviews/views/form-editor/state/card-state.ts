/**
 * How far a card is open: showing only its summary, all its statements without editing, as in a
 * read-only document, or the editor. Opening a card edits it; the form shows it read only where
 * the document cannot be edited.
 */
export type CardOpenState = 'collapsed' | 'readOnly' | 'edit';

/**
 * The state of one card. An open card stays open until its chevron collapses it.
 */
export interface CardState {
	/**
	 * How far the card is open.
	 */
	open: CardOpenState;
}

/**
 * The states of the cards, by resource identifier. A card without an entry is collapsed.
 */
export type CardStates = Record<string, CardState>;

/**
 * The transitions of the card states.
 */
export type CardStateAction =
	/**
	 * A click or a double click on a collapsed card, or a resource just created: open it for editing.
	 */
	| { type: 'open'; id: string }
	/**
	 * The corner chevron: collapse an open card, or open a collapsed one.
	 */
	| { type: 'toggle'; id: string }
	| { type: 'collapse'; id: string }
	/**
	 * Restore the open cards of an earlier visit.
	 */
	| { type: 'reset'; openIds: string[] };

/**
 * The state of a card showing only its summary.
 */
export const COLLAPSED_CARD: CardState = { open: 'collapsed' };

const OPEN_CARD: CardState = { open: 'edit' };

/**
 * Get the state of a card, collapsed when it has none.
 * @param states The states of the cards.
 * @param id The resource identifier of the card.
 * @returns The state.
 */
export function cardStateOf(states: CardStates, id: string): CardState {
	return states[id] ?? COLLAPSED_CARD;
}

/**
 * Get the identifiers of the open cards, which are remembered across reloads of the webview.
 * @param states The states of the cards.
 * @returns The identifiers.
 */
export function openCardIds(states: CardStates): string[] {
	return Object.keys(states).filter(id => states[id].open !== 'collapsed');
}

/**
 * Build the states from the open cards of an earlier visit.
 * @param openIds The identifiers of the cards that were open.
 * @returns The states.
 */
export function cardStatesFromOpenIds(openIds: readonly string[]): CardStates {
	const states: CardStates = {};

	for (const id of openIds) {
		states[id] = OPEN_CARD;
	}

	return states;
}

/**
 * Apply a transition to the card states.
 * @param states The current states.
 * @param action The transition.
 * @returns The next states, the same object when nothing changed.
 */
export function cardStateReducer(states: CardStates, action: CardStateAction): CardStates {
	switch (action.type) {
		case 'open':
			return cardStateOf(states, action.id).open === 'collapsed' ? _withState(states, action.id, OPEN_CARD) : states;
		case 'toggle':
			return _withState(states, action.id, cardStateOf(states, action.id).open === 'collapsed' ? OPEN_CARD : COLLAPSED_CARD);
		case 'collapse':
			return _withState(states, action.id, COLLAPSED_CARD);
		case 'reset':
			return cardStatesFromOpenIds(action.openIds);
		default:
			return states;
	}
}

/**
 * Replace the state of one card, dropping the entry of a collapsed card so the map holds only
 * the open ones.
 * @param states The current states.
 * @param id The resource identifier of the card.
 * @param state The new state of the card.
 * @returns The next states.
 */
function _withState(states: CardStates, id: string, state: CardState): CardStates {
	const result = { ...states };

	if (state.open === 'collapsed') {
		delete result[id];
	} else {
		result[id] = state;
	}

	return result;
}
