import { ResourceCardHeaderData } from '../form-editor-model';
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
	cardHeader: ResourceCardHeaderData;
}

/**
 * The title of a card: the icon of the kind of the resource and its label, dimmed where the
 * document states no label, with the matches of the filter of the form marked.
 * @param props The resource.
 * @returns The title.
 */
export function ResourceCardTitle({ cardHeader }: ResourceCardTitleProps): React.JSX.Element {
	const { filterText } = useFormEditorContext();

	return (
		<span className="resource-card-title">
			<span className="resource-card-kind"><ResourceIcon iconName={cardHeader.iconName} /></span>
			<span className={`resource-card-label${cardHeader.hasLabel ? '' : ' is-unnamed'}`}><HighlightedText text={cardHeader.label} query={filterText} /></span>
		</span>
	);
}
