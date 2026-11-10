import { KeyboardEvent, MouseEvent } from 'react';
import { TermView } from '../form-editor-model';
import { getTermLabel, getTermTitle } from './term-labels';

/**
 * Properties of the {@link ValuePill} component.
 */
export interface ValuePillProps {
	/**
	 * The resource the pill stands for.
	 */
	view: TermView;

	/**
	 * Follows the pill to the resource; the pill is a link when given.
	 */
	onNavigate?: () => void;

	/**
	 * Removes the value from its statement; the pill has a remove button when given.
	 */
	onRemove?: () => void;

	/**
	 * Hands the keys of the pill to the row it is a value of; the pill takes the focus by the
	 * arrows of its row, not by Tab, when given.
	 */
	onKeyDown?: (event: KeyboardEvent<HTMLSpanElement>) => void;

	/**
	 * Receives the element of the pill, for its row to focus.
	 */
	pillRef?: (element: HTMLSpanElement | null) => void;
}

/**
 * A resource value as a pill: a ring in the colour the definition tree gives the kind of the
 * resource, dashed for a term the document knows nothing about, and its label, with its IRI told
 * when the pointer rests on it. Where its statement is edited, the pill takes the keys of its row,
 * and a button that takes the place of the ring while the pointer or the focus is on it removes
 * it.
 * @param props The resource and what the pill does.
 * @returns The pill.
 */
export function ValuePill({ view, onNavigate, onRemove, onKeyDown, pillRef }: ValuePillProps): React.JSX.Element {
	const title = getTermTitle(view.term);
	const label = getTermLabel(view);

	const handleClick = (event: MouseEvent<HTMLSpanElement>): void => {
		event.stopPropagation();
		onNavigate?.();
	};

	const handleKeyDown = (event: KeyboardEvent<HTMLSpanElement>): void => {
		if (event.key === 'Enter') {
			event.preventDefault();
			onNavigate?.();
		}
	};

	return (
		<span
			ref={pillRef}
			className="value-pill"
			title={title}
			role={onNavigate ? 'link' : undefined}
			tabIndex={onKeyDown ? -1 : onNavigate ? 0 : undefined}
			aria-label={onKeyDown ? label : undefined}
			onClick={onNavigate ? handleClick : undefined}
			onKeyDown={onKeyDown ?? (onNavigate ? handleKeyDown : undefined)}
		>
			<span className={`value-ring${view.iconName ? '' : ' is-new'}`} data-icon={view.iconName} aria-hidden="true"></span>
			<span className="value-pill-label">{label}</span>
			{onRemove && (
				<button type="button" className="value-pill-remove" tabIndex={-1} aria-label={`Remove ${label}`} title="Remove" onMouseDown={event => event.preventDefault()} onClick={onRemove}>
					<vscode-icon name="close" size={12}></vscode-icon>
				</button>
			)}
		</span>
	);
}
