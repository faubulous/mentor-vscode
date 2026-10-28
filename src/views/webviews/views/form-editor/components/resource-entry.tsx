import { KeyboardEvent } from 'react';
import { ResourceSummary } from '../form-editor-model';
import { useFormEditorContext } from '../state/form-editor-context';
import { getHeadword } from './headword';
import { HighlightedText } from './highlighted-text';
import { ResourceIcon } from './resource-icon';

/**
 * Properties of the {@link ResourceEntry} component.
 */
export interface ResourceEntryProps {
	/**
	 * The resource.
	 */
	summary: ResourceSummary;

	/**
	 * Whether the entry is expanded.
	 */
	expanded: boolean;

	/**
	 * Whether the entry is the one under the top of the view, which the context bar names.
	 */
	current?: boolean;

	/**
	 * Expands the entry or folds it again.
	 */
	onToggle: (resourceId: string) => void;
}

/**
 * One resource of the document as an entry of the list: the type glyph in the gutter, the
 * headword with its description below it, and the usage count with the chevron on the line of
 * the headword. Expanded, the entry shows the IRI of the resource; its statements follow in a
 * later step. Entries are set apart by hairlines, not boxes.
 * @param props The resource and its state.
 * @returns The entry.
 */
export function ResourceEntry({ summary, expanded, current, onToggle }: ResourceEntryProps): React.JSX.Element {
	const { filterText, dominantTypeIri, revealedResourceId } = useFormEditorContext();
	const headword = getHeadword(summary);
	const showType = summary.typeIri !== undefined && summary.typeIri !== dominantTypeIri;
	const marked = current === true || revealedResourceId === summary.id;
	const toggle = (): void => onToggle(summary.id);

	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			toggle();
		}
	};

	return (
		<div className={`entry${expanded ? ' is-expanded' : ''}${marked ? ' is-current' : ''}`} data-resource-id={summary.id}>
			<div className="entry-glyph"><ResourceIcon iconName={summary.iconName} /></div>
			<div className="entry-main">
				<div className="entry-headword-row" role="button" tabIndex={0} aria-expanded={expanded} onClick={toggle} onKeyDown={handleKeyDown}>
					<span className={`entry-headword${summary.hasLabel ? '' : ' is-unnamed'}`}><HighlightedText text={headword} query={filterText} /></span>
					{showType && summary.typeLabel && <span className="entry-type">{summary.typeLabel}</span>}
				</div>
				{summary.description && <div className="entry-definition"><HighlightedText text={summary.description} query={filterText} /></div>}
				{expanded && <div className="entry-iri">{summary.prefixedName ?? (summary.term.kind === 'iri' ? summary.term.iri : summary.term.kind === 'bnode' ? `_:${summary.term.id}` : summary.term.value)}</div>}
			</div>
			<div className="entry-meta">
				{summary.usageCount !== undefined && <span className="entry-usage">{summary.usageCount} {summary.usageCount === 1 ? 'usage' : 'usages'}</span>}
				<button
					type="button"
					className={`entry-chevron${expanded ? ' is-expanded' : ''}`}
					aria-expanded={expanded}
					aria-label={expanded ? 'Collapse resource' : 'Expand resource'}
					title={expanded ? 'Collapse resource' : 'Expand resource'}
					onClick={event => {
						event.stopPropagation();
						toggle();
					}}
				>
					<vscode-icon name={expanded ? 'chevron-up' : 'chevron-down'} size={16}></vscode-icon>
				</button>
			</div>
		</div>
	);
}
