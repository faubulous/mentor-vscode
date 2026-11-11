import { useEffect, useRef, useState } from 'react';
import { useNestedCardsCollapse } from '../state/nested-cards-collapse-context';

/**
 * Whether a nested card shows only its header, and what toggles it.
 */
export interface NestedCollapse {
	/**
	 * Whether the card shows only its header.
	 */
	value: boolean;

	/**
	 * Collapse the card, or expand it again.
	 */
	toggle: () => void;
}

/**
 * Whether a nested card shows only its header, as it does at first, which its chevron toggles and
 * the title bar of the card it stands in sets for every nested card at once.
 * @param nested Whether the list is a nested card.
 * @returns The state and what toggles it.
 */
export function useNestedCollapse(nested: boolean): NestedCollapse {
	const request = useNestedCardsCollapse();
	const [value, setValue] = useState(nested && request.collapsed);
	const followed = useRef(request.revision);

	// A request of the title bar made after the card rendered collapses or expands it along with the others.
	useEffect(() => {
		if (nested && request.revision !== followed.current) {
			followed.current = request.revision;
			setValue(request.collapsed);
		}
	}, [nested, request]);

	return { value, toggle: () => setValue(current => !current) };
}
