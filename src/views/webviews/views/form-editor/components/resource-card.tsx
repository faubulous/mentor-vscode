import { useCallback, useEffect, useMemo } from 'react';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { ResourceSummary } from '../form-editor-model';
import { useResourceDetail } from '../hooks/use-resource-detail';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { useFormEditorContext } from '../state/form-editor-context';
import { HighlightedText } from './highlighted-text';
import { ResourceCardFooter } from './resource-card-footer';
import { ResourceCardHeader } from './resource-card-header';
import { StatementList } from './statement-list';

/**
 * Properties of the {@link ResourceCard} component.
 */
export interface ResourceCardProps {
	/**
	 * The resource.
	 */
	summary: ResourceSummary;

	/**
	 * Supplies the statements of the resource once the card is expanded.
	 */
	dataService: IResourceDataService;

	/**
	 * Whether the card is expanded.
	 */
	expanded: boolean;

	/**
	 * Whether writes of the statements of the card are not done yet: the statements stay mounted,
	 * hidden while the card is collapsed, so they receive the data the writes wait for.
	 */
	writing?: boolean;

	/**
	 * Whether the card is the one under the top of the view, which the context bar names.
	 */
	current?: boolean;

	/**
	 * Expands the card or folds it again.
	 */
	onToggle: (resource: NamedNode | BlankNode) => void;
}

/**
 * One resource of the document as a card of the list. Collapsed, the header is the clickable
 * area: the glyph of its kind in the gutter, the label with the type, and the usage count; the
 * description and the identifier of the resource follow. Expanded, the card is its statements, led
 * by the label row, whose button collapses the card again, and followed by the footer with the
 * IRI, whose local part renames the resource. Cards
 * are set apart by hairlines, not boxes.
 * @param props The resource and its state.
 * @returns The card.
 */
export function ResourceCard({ summary, dataService, expanded, writing = false, current, onToggle }: ResourceCardProps): React.JSX.Element {
	const { revealedResource, filterText } = useFormEditorContext();
	const { detail, stale } = useResourceDetail(dataService, summary.term);
	const marked = current === true || revealedResource?.equals(summary.term) === true;
	const toggle = useCallback((): void => onToggle(summary.term), [onToggle, summary.term]);
	const showsStatements = expanded || writing;
	const labelHeader = useMemo(() => ({ iconName: summary.iconName, usageCount: summary.usageCount, onCollapse: toggle }), [summary.iconName, summary.usageCount, toggle]);

	// A card showing its statements holds them current, wherever the list is scrolled to.
	useEffect(() => {
		if (showsStatements && (!detail || stale)) {
			dataService.request([summary.term]);
		}
	}, [showsStatements, detail, stale, dataService, summary.term]);

	return (
		<article className={`resource-card${expanded ? ' is-expanded' : ''}${marked ? ' is-current' : ''}`} data-resource-id={termToString(summary.term)}>
			{(!expanded || !detail) && <ResourceCardHeader summary={summary} expanded={expanded} onToggle={toggle} />}
			{!expanded && summary.description && <div className="resource-card-description"><HighlightedText text={summary.description} query={filterText} /></div>}
			{showsStatements && (
				<div className="resource-card-body" hidden={!expanded}>
					{detail
						? <StatementList detail={detail} stale={stale} dataService={dataService} depth={0} visited={[summary.term]} labelHeader={labelHeader} />
						: <div className="resource-form-loading">Loading…</div>}
				</div>
			)}
			{expanded && detail ? <ResourceCardFooter summary={summary} /> : <div className="resource-card-iri">{_identifierOf(summary)}</div>}
		</article>
	);
}

/**
 * The identifier a resource is written by: its prefixed name, its IRI, or its blank node label.
 * @param summary The resource.
 * @returns The identifier.
 */
function _identifierOf(summary: ResourceSummary): string {
	if (summary.prefixedName) {
		return summary.prefixedName;
	}

	return summary.term.termType === 'NamedNode' ? summary.term.value : `_:${summary.term.value}`;
}
