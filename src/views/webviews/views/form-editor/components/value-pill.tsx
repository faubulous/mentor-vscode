import { KeyboardEvent, MouseEvent } from 'react';
import { InputFieldBinding } from '../hooks/use-statement-editor';
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
	 * The text of the pill.
	 */
	label: string;

	/**
	 * The name told when the pointer rests on the pill, such as the IRI of the resource.
	 */
	title?: string;

	/**
	 * The icon the definition tree shows for the resource, when it is known.
	 */
	iconName?: string;

	/**
	 * Follows the pill to the resource; the pill is a link when given.
	 */
	onNavigate?: () => void;

	/**
	 * Wires the pill to the row it is a value of; the pill takes the focus as a whole when given,
	 * through the arrows rather than Tab.
	 */
	field?: InputFieldBinding;

	/**
	 * Removes the value; the pill shows a remove button when given.
	 */
	onRemove?: () => void;
}

/**
 * A resource value as a pill: the icon the definition tree shows for the resource, in the colour
 * the tree gives its kind, and its label, with its IRI told when the pointer rests on it. Read,
 * the pill leads to the resource; edited, it is one value of its row, which the keys act on as a
 * whole, and its icon gives way to a remove button while the pointer or the focus is on it.
 * @param props The resource and where the pill leads or belongs.
 * @returns The pill.
 */
export function ValuePill({ label, title, iconName, onNavigate, field, onRemove }: ValuePillProps): React.JSX.Element {
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

	const handleRemove = (event: MouseEvent<HTMLButtonElement>): void => {
		event.preventDefault();
		event.stopPropagation();
		onRemove?.();
	};

	return (
		<span
			{...field}
			className="value-pill"
			title={title}
			role={onNavigate ? 'link' : undefined}
			tabIndex={field ? -1 : onNavigate ? 0 : undefined}
			aria-label={field ? label : undefined}
			onClick={onNavigate ? handleClick : undefined}
			onKeyDown={field?.onKeyDown ?? (onNavigate ? handleKeyDown : undefined)}
		>
			<span className="value-pill-icon"><ResourceIcon iconName={iconName ?? DEFAULT_PILL_ICON} size={14} /></span>
			{onRemove && (
				<button type="button" className="value-pill-remove" tabIndex={-1} aria-label={`Remove ${label}`} title="Remove" onMouseDown={event => event.preventDefault()} onClick={handleRemove}>
					<vscode-icon name="close" size={12}></vscode-icon>
				</button>
			)}
			<span className="value-pill-label">{label}</span>
		</span>
	);
}
