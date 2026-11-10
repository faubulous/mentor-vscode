import { createContext, useContext } from 'react';

/**
 * What the title bar of a card last asked of the nested cards in it: to collapse or to expand,
 * all of them at once. The revision tells one request from the next with the same answer.
 */
export interface CardFold {
	/**
	 * Whether the nested cards were asked to collapse.
	 */
	collapsed: boolean;

	/**
	 * The number of requests so far; zero before the first.
	 */
	revision: number;
}

/**
 * The fold of the card a nested card stands in, which its title bar sets: collapsed until asked
 * otherwise, as nested cards start collapsed.
 */
export const CardFoldContext = createContext<CardFold>({ collapsed: true, revision: 0 });

/**
 * The fold of the card the component stands in.
 * @returns The fold.
 */
export function useCardFold(): CardFold {
	return useContext(CardFoldContext);
}
