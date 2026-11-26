import { useEffect } from 'react';
import { ResourceCardHeaderData } from '../form-editor-model';
import { useResourceCardBody } from '../hooks/use-resource-card-body';
import { useFormEditorContext } from '../state/form-editor-context';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { CardUsage } from './card-usage';
import { PinnedPropertiesList } from './pinned-properties-list';
import { ResourceCardTitle } from './resource-card-title';
import { getShownTypeLabels, ResourceCardTypes } from './resource-card-types';

/**
 * Properties of the {@link CompactResourceCard} component.
 */
export interface CompactResourceCardProps {
	/**
	 * The resource.
	 */
	cardHeader: ResourceCardHeaderData;

	/**
	 * Supplies the statements of the resource, which its pinned properties are read from.
	 */
	dataService: IResourceDataService;
}

/**
 * The card of a resource in its most compact density, as a tooltip shows it, laid out as the larger
 * card: a title bar with the types of the resource and its usage count, the title under it, the
 * pinned properties of its types, or else its description as text without a caption, and a footer
 * with the IRI. What the reasoner infers it shows as the form does: in italics, where shown. It has no controls, no placeholders and no empty rows, and takes no part in editing.
 * @param props The resource and where its statements come from.
 * @returns The card.
 */
export function CompactResourceCard({ cardHeader, dataService }: CompactResourceCardProps): React.JSX.Element {
	const { cardBody, stale } = useResourceCardBody(dataService, cardHeader.subject);
	const pins = cardHeader.pins ?? [];
	const { showInferred = true } = useFormEditorContext();
	const types = getShownTypeLabels(cardHeader, showInferred);
	const typed = types.asserted.length > 0 || types.inferred.length > 0;
	const identifier = cardHeader.subject.termType === 'NamedNode' ? cardHeader.subject.value : `_:${cardHeader.subject.value}`;

	// The pinned properties are read from the statements, which are asked for while they are not current.
	useEffect(() => {
		if (pins.length > 0 && (!cardBody || stale)) {
			dataService.request([cardHeader.subject]);
		}
	}, [pins.length, cardBody, stale, dataService, cardHeader.subject]);

	return (
		<article className="resource-card is-compact" data-density="tooltip">
			{(typed || cardHeader.usageCount !== undefined) && (
				<div className="compact-card-title-bar">
					<ResourceCardTypes cardHeader={cardHeader} className="compact-card-types" />
					{cardHeader.usageCount !== undefined && <CardUsage count={cardHeader.usageCount} />}
				</div>
			)}
			<div className="compact-card-title">
				<ResourceCardTitle cardHeader={cardHeader} />
			</div>
			{pins.length > 0 && cardBody
				? <PinnedPropertiesList cardBody={cardBody} pins={pins} />
				: cardHeader.description && <div className="resource-card-description">{cardHeader.description}</div>}
			<div className="compact-card-footer">
				<span className="compact-card-iri">{identifier}</span>
			</div>
		</article>
	);
}
