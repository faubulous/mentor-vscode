import { useEffect } from 'react';
import { NestedResourceRef } from '../form-editor-model';
import { useResourceDetail } from '../hooks/use-resource-detail';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { NestedResourcePlaceholder } from './nested-resource-placeholder';
import { StatementList } from './statement-list';

/**
 * The nesting depth beyond which blank nodes stop being rendered in place as cards, so that a
 * deeply nested structure cannot expand without bound.
 */
const MAX_NESTING_DEPTH = 3;

/**
 * Properties of the {@link NestedResourceCard} component.
 */
export interface NestedResourceCardProps {
	/**
	 * The blank node.
	 */
	nested: NestedResourceRef;

	/**
	 * Supplies the statements of the node.
	 */
	dataService: IResourceDataService;

	/**
	 * The nesting depth of this card: one for a blank node of a top-level card.
	 */
	depth: number;

	/**
	 * The resources that hold this card, which guard against cycles.
	 */
	visited: readonly string[];
}

/**
 * A blank node rendered below the value that refers to it, as a card without a header: it has
 * no identity to lead with and nothing to collapse to, so its statements are what it is. Beyond
 * the nesting limit it is a placeholder that scrolls to the node.
 * @param props The blank node and where it stands.
 * @returns The card, or nothing for a node that holds this card already.
 */
export function NestedResourceCard({ nested, dataService, depth, visited }: NestedResourceCardProps): React.JSX.Element | null {
	const { detail, stale } = useResourceDetail(dataService, nested.id);

	// The node is asked for when nothing is known of it, and again after the document changed.
	useEffect(() => {
		if (!detail || stale) {
			dataService.request([nested.id]);
		}
	}, [detail, stale, dataService, nested.id]);

	if (visited.includes(nested.id)) {
		return null;
	}

	if (depth > MAX_NESTING_DEPTH) {
		return <NestedResourcePlaceholder nested={nested} />;
	}

	if (!detail) {
		return <div className="resource-card is-nested" data-resource-id={nested.id}><div className="resource-form-loading">Loading…</div></div>;
	}

	return (
		<div className="resource-card is-nested" data-resource-id={nested.id}>
			{detail.comments && <div className="statement-comment">{detail.comments.join('\n')}</div>}
			<StatementList detail={detail} dataService={dataService} depth={depth} visited={[...visited, nested.id]} />
		</div>
	);
}
