import { useCallback, useEffect, useState } from 'react';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { ResourceSummary } from '../form-editor-model';
import { useResourceDetail } from '../hooks/use-resource-detail';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { CardFold, CardFoldContext } from '../state/card-fold-context';
import { useFormEditorContext } from '../state/form-editor-context';
import { HighlightedText } from './highlighted-text';
import { ResourceCardHeader } from './resource-card-header';
import { ResourceCardTitleBar } from './resource-card-title-bar';
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
 * One resource of the document as a card of the list, led by its title bar, which stays in view
 * while the card scrolls. Collapsed, the label row is the clickable area: the icon of the kind of
 * the resource in the gutter, the label and the types; the description follows. Expanded, the card
 * is its statements, led by the label row, and ends with the link that adds a property. The title
 * bar asks the nested cards of the card to collapse or expand all at once.
 * @param props The resource and its state.
 * @returns The card.
 */
export function ResourceCard({ summary, dataService, expanded, writing = false, current, onToggle }: ResourceCardProps): React.JSX.Element {
	const { revealedResource, filterText } = useFormEditorContext();
	const { detail, stale } = useResourceDetail(dataService, summary.term);
	const marked = current === true || revealedResource?.equals(summary.term) === true;
	const toggle = useCallback((): void => onToggle(summary.term), [onToggle, summary.term]);
	const showsStatements = expanded || writing;
	const [fold, setFold] = useState<CardFold>({ collapsed: true, revision: 0 });
	const toggleNested = useCallback((): void => setFold(current => ({ collapsed: !current.collapsed, revision: current.revision + 1 })), []);

	// A card showing its statements holds them current, wherever the list is scrolled to.
	useEffect(() => {
		if (showsStatements && (!detail || stale)) {
			dataService.request([summary.term]);
		}
	}, [showsStatements, detail, stale, dataService, summary.term]);

	return (
		<article className={`resource-card${expanded ? ' is-expanded' : ''}${marked ? ' is-current' : ''}`} data-resource-id={termToString(summary.term)}>
			<ResourceCardTitleBar summary={summary} expanded={expanded} nestedCollapsed={fold.collapsed} onToggle={toggle} onToggleNested={toggleNested} />
			{(!expanded || !detail) && <ResourceCardHeader summary={summary} expanded={expanded} onToggle={toggle} />}
			{!expanded && summary.description && <div className="resource-card-description"><HighlightedText text={summary.description} query={filterText} /></div>}
			{showsStatements && (
				<CardFoldContext.Provider value={fold}>
					<div className="resource-card-body" hidden={!expanded}>
						{detail
							? <StatementList detail={detail} stale={stale} dataService={dataService} depth={0} visited={[summary.term]} labelRow />
							: <div className="resource-form-loading">Loading…</div>}
					</div>
				</CardFoldContext.Provider>
			)}
		</article>
	);
}
