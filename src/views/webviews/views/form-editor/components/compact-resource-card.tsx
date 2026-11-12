import { useEffect } from 'react';
import { ResourceSummary } from '../form-editor-model';
import { useResourceDetail } from '../hooks/use-resource-detail';
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
	summary: ResourceSummary;

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
export function CompactResourceCard({ summary, dataService }: CompactResourceCardProps): React.JSX.Element {
	const { detail, stale } = useResourceDetail(dataService, summary.term);
	const pins = summary.pins ?? [];
	const types = getTypeLabels(summary);
	const identifier = summary.term.termType === 'NamedNode' ? summary.term.value : `_:${summary.term.value}`;

	// The pinned properties are read from the statements, which are asked for while they are not current.
	useEffect(() => {
		if (pins.length > 0 && (!detail || stale)) {
			dataService.request([summary.term]);
		}
	}, [pins.length, detail, stale, dataService, summary.term]);

	return (
		<article className="resource-card is-compact" data-density="tooltip">
			<div className="compact-card-title">
				<ResourceCardTitle summary={summary} />
				{types.length > 0 && <span className="compact-card-types">{types.join(', ')}</span>}
			</div>
			{pins.length > 0 && detail
				? <PinnedPropertiesList detail={detail} pins={pins} />
				: summary.description && <div className="resource-card-description">{summary.description}</div>}
			<div className="compact-card-footer">
				<span className="compact-card-iri">{identifier}</span>
				{summary.usageCount !== undefined && <CardUsage count={summary.usageCount} />}
			</div>
		</article>
	);
}
