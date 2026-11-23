import { MouseEvent } from 'react';
import { useClickGuard } from '../hooks/use-click-guard';
import { LiteralAnnotationData } from './datatype-labels';

/**
 * Properties of the {@link LiteralAnnotationButton} component.
 */
export interface LiteralAnnotationButtonProps {
	/**
	 * The annotation the button shows.
	 */
	annotation: LiteralAnnotationData;

	/**
	 * Why the text does not fit the datatype, shown as the tooltip in place of that of the annotation.
	 */
	problem?: string;

	/**
	 * The class of an annotation that is not the annotation of a value, such as a suggestion.
	 */
	variant?: string;

	/**
	 * Whether the annotation appeared because of what the user just did, as the type of a new value or a
	 * suggestion: it then ignores the pointer for a moment, so a click meant for the text does not
	 * land on it.
	 */
	guarded?: boolean;

	/**
	 * Called when the annotation is pressed: it opens or closes the annotation picker, or accepts a suggestion.
	 */
	onAct: () => void;
}

/**
 * The annotation after the text of a value: the datatype or language of a literal, the type of a new
 * value, or a suggested datatype. It acts on the press of the mouse, whose default is prevented,
 * so the focus never leaves the text for the annotation; a click by the keyboard acts too. One that
 * appears because of what the user just did ignores the pointer until it has moved away and a
 * moment has passed, looking the same meanwhile.
 * @param props The annotation and what pressing it does.
 * @returns The button.
 */
export function LiteralAnnotationButton({ annotation, problem, variant, guarded = false, onAct }: LiteralAnnotationButtonProps): React.JSX.Element {
	const ignoresPointer = useClickGuard(guarded);
	const classes = ['literal-field-annotation', ...(variant ? [variant] : []), ...(ignoresPointer ? ['is-guarded'] : [])];

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
			title={problem ?? annotation.tooltip}
			aria-label={annotation.accessibleName}
			onMouseDown={handleMouseDown}
			onClick={handleClick}
		>
			{annotation.text}
		</button>
	);
}
