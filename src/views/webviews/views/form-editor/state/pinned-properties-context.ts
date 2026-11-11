import { createContext, useContext } from 'react';
import { NamedNode } from '@rdfjs/types';
import { PinnedProperty } from '../form-editor-model';
import { ScopeKey } from '@src/utilities/config-scope';

/**
 * The pins of the card a row stands in, and what pins a property of it.
 */
export interface PinnedProperties {
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
	onPin?: (predicate: NamedNode, scope: ScopeKey | undefined) => void;
}

/**
 * The pins of the card a row stands in, which the card provides.
 */
export const PinnedPropertiesContext = createContext<PinnedProperties>({ pins: [] });

/**
 * The pins of the card the component stands in.
 * @returns The pins.
 */
export function usePinnedProperties(): PinnedProperties {
	return useContext(PinnedPropertiesContext);
}
