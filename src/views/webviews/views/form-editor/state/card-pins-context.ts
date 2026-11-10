import { createContext, useContext } from 'react';
import { NamedNode } from '@rdfjs/types';
import { PinnedProperty, PinScope } from '../form-editor-model';

/**
 * The pins of the card a row stands in, and what pins a property of it.
 */
export interface CardPins {
	/**
	 * The properties pinned for the types of the resource of the card.
	 */
	pins: readonly PinnedProperty[];

	/**
	 * Pin a property of the resource, or unpin it; absent for a resource of no known type, which
	 * cannot pin.
	 * @param predicate The predicate.
	 * @param scope Who to pin it for, or `undefined` to unpin it.
	 */
	onPin?: (predicate: NamedNode, scope: PinScope | undefined) => void;
}

/**
 * The pins of the card a row stands in, which the card provides.
 */
export const CardPinsContext = createContext<CardPins>({ pins: [] });

/**
 * The pins of the card the component stands in.
 * @returns The pins.
 */
export function useCardPins(): CardPins {
	return useContext(CardPinsContext);
}
