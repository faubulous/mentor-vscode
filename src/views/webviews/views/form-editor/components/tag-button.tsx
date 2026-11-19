import { MouseEvent } from 'react';
import { useClickGuard } from '../hooks/use-click-guard';
import { LiteralTagData } from './datatype-labels';

/**
 * Properties of the {@link TagButton} component.
 */
export interface TagButtonProps {
	/**
	 * The tag the button shows.
	 */
	tag: LiteralTagData;

	/**
	 * Why the text does not fit the datatype, shown as the tooltip in place of that of the tag.
	 */
	problem?: string;

	/**
	 * The class of a tag that is not the tag of a value, such as a suggestion.
	 */
	variant?: string;

	/**
	 * Whether the tag appeared because of what the user just did, as the kind of a new value or a
	 * suggestion: it then ignores the pointer for a moment, so a click meant for the text does not
	 * land on it.
	 */
	guarded?: boolean;

	/**
	 * Called when the tag is pressed: it opens or closes the tag picker, or accepts a suggestion.
	 */
	onAct: () => void;
}

/**
 * The tag after the text of a value: the datatype or language of a literal, the kind of a new
 * value, or a suggested datatype. It acts on the press of the mouse, whose default is prevented,
 * so the focus never leaves the text for the tag; a click by the keyboard acts too. A tag that
 * appears because of what the user just did ignores the pointer until it has moved away and a
 * moment has passed, looking the same meanwhile.
 * @param props The tag and what pressing it does.
 * @returns The button.
 */
export function TagButton({ tag, problem, variant, guarded = false, onAct }: TagButtonProps): React.JSX.Element {
	const ignoresPointer = useClickGuard(guarded);
	const classes = ['literal-field-tag', ...(variant ? [variant] : []), ...(ignoresPointer ? ['is-guarded'] : [])];

	const handleMouseDown = (event: MouseEvent<HTMLButtonElement>): void => {
		event.preventDefault();
		onAct();
	};

	const handleClick = (event: MouseEvent<HTMLButtonElement>): void => {
		if (event.detail === 0) {
			onAct();
		}
	};

	return (
		<button
			type="button"
			className={classes.join(' ')}
			title={problem ?? tag.tooltip}
			aria-label={tag.accessibleName}
			onMouseDown={handleMouseDown}
			onClick={handleClick}
		>
			{tag.text}
		</button>
	);
}
