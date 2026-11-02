import { KeyboardEvent, useEffect } from 'react';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { ResourceSummary } from '../form-editor-model';
import { useResourceDetail } from '../hooks/use-resource-detail';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { useFormEditorContext } from '../state/form-editor-context';
import { HighlightedText } from './highlighted-text';
import { ResourceIcon } from './resource-icon';
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
 * One resource of the document as a card of the list, in three parts: the header, which is the
 * clickable area, with the type glyph, the label, the type and the chevron; the body with the
 * description and, once expanded, the IRI of the resource and its statements; and the footer
 * with the usage count. Cards are set apart by hairlines, not boxes.
 * @param props The resource and its state.
 * @returns The card.
 */
export function ResourceCard({ summary, dataService, expanded, writing = false, current, onToggle }: ResourceCardProps): React.JSX.Element {
	const { filterText, dominantTypeIri, revealedResource } = useFormEditorContext();
	const { detail, stale } = useResourceDetail(dataService, summary.term);
	const showType = summary.typeIri !== undefined && summary.typeIri !== dominantTypeIri;
	const marked = current === true || revealedResource?.equals(summary.term) === true;
	const toggle = (): void => onToggle(summary.term);
	const showsStatements = expanded || writing;

	// A card showing its statements holds them current, wherever the list is scrolled to.
	useEffect(() => {
		if (showsStatements && (!detail || stale)) {
			dataService.request([summary.term]);
		}
	}, [showsStatements, detail, stale, dataService, summary.term]);

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggle();
		}
	};

	return (
		<article className={`resource-card${expanded ? ' is-expanded' : ''}${marked ? ' is-current' : ''}`} data-resource-id={termToString(summary.term)}>
			<div className="resource-card-header" role="button" tabIndex={0} aria-expanded={expanded} onClick={toggle} onKeyDown={handleKeyDown}>
				<div className="resource-card-glyph"><ResourceIcon iconName={summary.iconName} /></div>
				<div className="resource-card-title">
					<span className={`resource-card-label${summary.hasLabel ? '' : ' is-unnamed'}`}><HighlightedText text={summary.label} query={filterText} /></span>
					{showType && summary.typeLabel && <span className="resource-card-type">{summary.typeLabel}</span>}
				</div>
				<span className="resource-card-chevron" aria-hidden="true">
					<vscode-icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16}></vscode-icon>
				</span>
			</div>
			{(summary.description || showsStatements) && (
				<div className="resource-card-body">
					{summary.description && <div className="resource-card-description"><HighlightedText text={summary.description} query={filterText} /></div>}
					{expanded && <div className="resource-card-iri">{_identifierOf(summary)}</div>}
					{showsStatements && (
						<div hidden={!expanded}>
							{detail
								? <StatementList detail={detail} stale={stale} dataService={dataService} depth={0} visited={[summary.term]} />
								: <div className="resource-form-loading">Loading…</div>}
						</div>
					)}
				</div>
			)}
			{summary.usageCount !== undefined && (
				<div className="resource-card-footer">
					<span className="resource-card-usage">{summary.usageCount} {summary.usageCount === 1 ? 'usage' : 'usages'}</span>
				</div>
			)}
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
