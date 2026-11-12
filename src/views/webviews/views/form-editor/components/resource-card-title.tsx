import { ResourceSummary } from '../form-editor-model';
import { useFormEditorContext } from '../state/form-editor-context';
import { HighlightedText } from './highlighted-text';
import { ResourceIcon } from './resource-icon';

/**
 * Properties of the {@link ResourceCardTitle} component.
 */
export interface ResourceCardTitleProps {
	/**
	 * The resource.
	 */
	summary: ResourceSummary;
}

/**
 * The title of a card: the icon of the kind of the resource and its label, dimmed where the
 * document states no label, with the matches of the filter of the form marked.
 * @param props The resource.
 * @returns The title.
 */
export function ResourceCardTitle({ summary }: ResourceCardTitleProps): React.JSX.Element {
	const { filterText } = useFormEditorContext();

	return (
		<span className="resource-card-title">
			<span className="resource-card-kind"><ResourceIcon iconName={summary.iconName} /></span>
			<span className={`resource-card-label${summary.hasLabel ? '' : ' is-unnamed'}`}><HighlightedText text={summary.label} query={filterText} /></span>
		</span>
	);
}

/**
 * The labels of the types a card names for its resource: every type it asserts, each once.
 * @param summary The resource.
 * @returns The labels, in the order asserted.
 */
export function getTypeLabels(summary: ResourceSummary): string[] {
	const labels = summary.typeLabels ?? (summary.typeLabel ? [summary.typeLabel] : []);

	return Array.from(new Set(labels));
}
