import { KeyboardEvent, MouseEvent } from 'react';
import { TermView } from '../form-editor-model';
import { ResourceIcon } from './resource-icon';

/**
 * The icon of a resource whose kind nothing tells, as in the definition tree.
 */
const DEFAULT_PILL_ICON = 'mentor-rdf-individual';

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
 * A resource value as a pill: the icon the definition tree shows for the resource, in the colour
 * the tree gives its kind, and its label, with its IRI told when the pointer rests on it. Where
 * its statement is edited, the pill takes the keys of its row, and a button that takes the place
 * of its icon while the pointer or the focus is on it removes it.
 * @param props The resource and what the pill does.
 * @returns The pill.
 */
export function ValuePill({ view, onNavigate, onRemove, onKeyDown, pillRef }: ValuePillProps): React.JSX.Element {
	const title = view.term.kind === 'iri' ? view.term.iri : view.term.kind === 'bnode' ? `_:${view.term.id}` : undefined;
	const label = view.label || view.prefixedName || title;

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
			<span className="value-pill-icon"><ResourceIcon iconName={view.iconName ?? DEFAULT_PILL_ICON} size={14} /></span>
			<span className="value-pill-label">{label}</span>
			{onRemove && (
				<button type="button" className="value-pill-remove" tabIndex={-1} aria-label={`Remove ${label}`} title="Remove" onMouseDown={event => event.preventDefault()} onClick={onRemove}>
					<vscode-icon name="close" size={12}></vscode-icon>
				</button>
			)}
		</span>
	);
}
