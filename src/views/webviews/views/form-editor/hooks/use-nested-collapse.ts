import { useEffect, useRef, useState } from 'react';
import { useCardFold } from '../state/card-fold-context';

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
	const fold = useCardFold();
	const [value, setValue] = useState(nested && fold.collapsed);
	const followed = useRef(fold.revision);

	// A request of the title bar made after the card rendered folds it along with the others.
	useEffect(() => {
		if (nested && fold.revision !== followed.current) {
			followed.current = fold.revision;
			setValue(fold.collapsed);
		}
	}, [nested, fold]);

	return { value, toggle: () => setValue(current => !current) };
}
