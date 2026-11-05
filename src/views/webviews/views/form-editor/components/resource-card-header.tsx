import { KeyboardEvent } from 'react';
import { ResourceSummary } from '../form-editor-model';
import { useFormEditorContext } from '../state/form-editor-context';
import { CardGlyph } from './card-glyph';
import { CardUsage } from './card-usage';
import { HighlightedText } from './highlighted-text';

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
 * The header of a collapsed card, which is its clickable area: the glyph of the kind of the
 * resource in the gutter, which turns into the chevron on hover, the label with the type unless it
 * is the type most resources have, and the usage count.
 * @param props The resource and how the card toggles.
 * @returns The header.
 */
export function ResourceCardHeader({ summary, expanded, onToggle }: ResourceCardHeaderProps): React.JSX.Element {
	const { filterText, dominantTypeIri } = useFormEditorContext();
	const showType = summary.typeIri !== undefined && summary.typeIri !== dominantTypeIri;

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onToggle();
		}
	};

	return (
		<div className="resource-card-header" role="button" tabIndex={0} aria-expanded={expanded} onClick={onToggle} onKeyDown={handleKeyDown}>
			<span className="resource-card-gutter"><CardGlyph iconName={summary.iconName} expanded={expanded} /></span>
			<span className="resource-card-title">
				<span className={`resource-card-label${summary.hasLabel ? '' : ' is-unnamed'}`}><HighlightedText text={summary.label} query={filterText} /></span>
				{showType && summary.typeLabel && <span className="resource-card-type">{summary.typeLabel}</span>}
			</span>
			{summary.usageCount !== undefined && <CardUsage count={summary.usageCount} />}
		</div>
	);
}
