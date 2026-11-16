import { useEffect } from 'react';
import { ResourceCardHeaderData } from '../form-editor-model';
import { useResourceCardBody } from '../hooks/use-resource-card-body';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { CardUsage } from './card-usage';
import { PinnedPropertiesList } from './pinned-properties-list';
import { getTypeLabels, ResourceCardTitle } from './resource-card-title';

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
 * The card of a resource in its most compact density, as a tooltip shows it: the title with the
 * types of the resource, the pinned properties of its types, or else its description as text
 * without a caption, and a footer with the IRI and the usage count. It has no controls, no
 * placeholders and no empty rows, and takes no part in editing.
 * @param props The resource and where its statements come from.
 * @returns The card.
 */
export function CompactResourceCard({ cardHeader, dataService }: CompactResourceCardProps): React.JSX.Element {
	const { cardBody, stale } = useResourceCardBody(dataService, cardHeader.subject);
	const pins = cardHeader.pins ?? [];
	const types = getTypeLabels(cardHeader);
	const identifier = cardHeader.subject.termType === 'NamedNode' ? cardHeader.subject.value : `_:${cardHeader.subject.value}`;

	// The pinned properties are read from the statements, which are asked for while they are not current.
	useEffect(() => {
		if (pins.length > 0 && (!cardBody || stale)) {
			dataService.request([cardHeader.subject]);
		}
	}, [pins.length, cardBody, stale, dataService, cardHeader.subject]);

	return (
		<article className="resource-card is-compact" data-density="tooltip">
			<div className="compact-card-title">
				<ResourceCardTitle cardHeader={cardHeader} />
				{types.length > 0 && <span className="compact-card-types">{types.join(', ')}</span>}
			</div>
			{pins.length > 0 && cardBody
				? <PinnedPropertiesList cardBody={cardBody} pins={pins} />
				: cardHeader.description && <div className="resource-card-description">{cardHeader.description}</div>}
			<div className="compact-card-footer">
				<span className="compact-card-iri">{identifier}</span>
				{cardHeader.usageCount !== undefined && <CardUsage count={cardHeader.usageCount} />}
			</div>
		</article>
	);
}
