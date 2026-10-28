import { ResourceIcon } from './resource-icon';

/**
 * Properties of the {@link ContextBar} component.
 */
export interface ContextBarProps {
	/**
	 * Whether the title of the document has scrolled out of view, which shows the bar.
	 */
	visible: boolean;

	/**
	 * The title of the document.
	 */
	title: string;

	/**
	 * The icon of the resource describing the document, when it has one.
	 */
	iconName?: string;

	/**
	 * The label of the card under the top of the view.
	 */
	guideWord?: string;

	/**
	 * Where that entry stands in the list, from one.
	 */
	position?: number;

	/**
	 * How many entries the list has.
	 */
	count: number;

	/**
	 * Whether a filter narrows the list, which counts matches rather than resources.
	 */
	filtering: boolean;

	/**
	 * Called when the title is activated, which scrolls back to the top.
	 */
	onActivate: () => void;
}

/**
 * The running head of the form, shown once the title of the document has scrolled out of view:
 * the document at its start, and at its end the label of the card under the top of the view
 * with where it stands in the list. It hangs from an anchor of no height, so it overlays the
 * entries instead of moving them as it appears.
 * @param props The title, the current entry and the counts.
 * @returns The bar.
 */
export function ContextBar({ visible, title, iconName, guideWord, position, count, filtering, onActivate }: ContextBarProps): React.JSX.Element {
	const total = `${count} ${filtering ? 'matches' : ''}`.trim();

	return (
		<div className="context-bar-anchor">
			<div className={`context-bar${visible ? ' is-visible' : ''}`} aria-hidden={visible ? undefined : true}>
				<div className="context-bar-content">
					<button type="button" className="context-bar-title" tabIndex={visible ? 0 : -1} title="Back to the top" onClick={onActivate}>
						{iconName && <ResourceIcon iconName={iconName} size={14} />}
						<span>{title}</span>
					</button>
					<span className="context-bar-position">
						{guideWord && <span className="context-bar-guide">{guideWord}</span>}
						{guideWord && position !== undefined && ' · '}
						{position !== undefined ? `${position} of ${total}` : total}
					</span>
				</div>
			</div>
		</div>
	);
}
