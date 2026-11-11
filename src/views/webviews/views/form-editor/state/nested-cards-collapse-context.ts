import { createContext, useContext } from 'react';

/**
 * What the title bar of a card last asked of the nested cards in it: to collapse or to expand,
 * all of them at once. The revision tells one request from the next with the same answer.
 */
export interface NestedCardsCollapse {
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
 * Whether the nested cards of a card are to be collapsed, which its title bar sets: collapsed until asked
 * otherwise, as nested cards start collapsed.
 */
export const NestedCardsCollapseContext = createContext<NestedCardsCollapse>({ collapsed: true, revision: 0 });

/**
 * Whether the nested cards of the card the component stands in are to be collapsed.
 * @returns The request.
 */
export function useNestedCardsCollapse(): NestedCardsCollapse {
	return useContext(NestedCardsCollapseContext);
}
