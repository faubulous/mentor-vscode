import { KeyboardEvent } from 'react';
import { ResourceSummary } from '../form-editor-model';
import { useFormEditorContext } from '../state/form-editor-context';
import { HighlightedText } from './highlighted-text';
import { ResourceIcon } from './resource-icon';

/**
 * Properties of the {@link ResourceCardHeader} component.
 */
export interface ResourceCardHeaderProps {
	/**
	 * The resource.
	 */
	summary: ResourceSummary;

	/**
	 * Whether the card is expanded, as it is while its statements load.
	 */
	expanded: boolean;

	/**
	 * Expands the card or folds it again.
	 */
	onToggle: () => void;
}

/**
 * The label row of a collapsed card, which is its clickable area: the icon of the kind of the
 * resource under the chevron of the title bar, and the label as the title of the card, starting
 * where the types in the title bar start; it names no predicate.
 * @param props The resource and how the card toggles.
 * @returns The label row.
 */
export function ResourceCardHeader({ summary, expanded, onToggle }: ResourceCardHeaderProps): React.JSX.Element {
	const { filterText } = useFormEditorContext();

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onToggle();
		}
	};

	return (
		<div className="resource-card-header" role="button" tabIndex={0} aria-expanded={expanded} onClick={onToggle} onKeyDown={handleKeyDown}>
			<span className="resource-card-title">
				<span className="resource-card-kind"><ResourceIcon iconName={summary.iconName} /></span>
				<span className={`resource-card-label${summary.hasLabel ? '' : ' is-unnamed'}`}><HighlightedText text={summary.label} query={filterText} /></span>
			</span>
		</div>
	);
}
