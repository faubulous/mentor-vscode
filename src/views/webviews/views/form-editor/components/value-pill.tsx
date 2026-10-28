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
}

/**
 * A resource value as a pill: the icon the definition tree shows for the resource, in the colour
 * the tree gives its kind, and its label, with its IRI told when the pointer rests on it.
 * @param props The resource and where the pill leads.
 * @returns The pill.
 */
export function ValuePill({ view, onNavigate }: ValuePillProps): React.JSX.Element {
	const title = view.term.kind === 'iri' ? view.term.iri : view.term.kind === 'bnode' ? `_:${view.term.id}` : undefined;

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
		<span className="value-pill" title={title} role={onNavigate ? 'link' : undefined} tabIndex={onNavigate ? 0 : undefined} onClick={onNavigate ? handleClick : undefined} onKeyDown={onNavigate ? handleKeyDown : undefined}>
			<span className="value-pill-icon"><ResourceIcon iconName={view.iconName ?? DEFAULT_PILL_ICON} size={14} /></span>
			<span className="value-pill-label">{view.label || view.prefixedName || title}</span>
		</span>
	);
}
