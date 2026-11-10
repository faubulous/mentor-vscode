import { NamedNode } from '@rdfjs/types';
import { ResourceSummary } from '../form-editor-model';
import { useFormEditorContext } from '../state/form-editor-context';
import { CardUsage } from './card-usage';
import { IriField } from './iri-field';

/**
 * Properties of the {@link ResourceCardTitleBar} component.
 */
export interface ResourceCardTitleBarProps {
	/**
	 * The resource.
	 */
	summary: ResourceSummary;

	/**
	 * Whether the card is expanded.
	 */
	expanded: boolean;

	/**
	 * Whether the nested cards of the card were last asked to collapse.
	 */
	nestedCollapsed: boolean;

	/**
	 * Expands the card or folds it again.
	 */
	onToggle: () => void;

	/**
	 * Collapses every nested card of the card, or expands them again.
	 */
	onToggleNested: () => void;
}

/**
 * The title bar of a card, which stays in view while the card scrolls: the chevron that collapses
 * and expands the card, the full IRI of the resource, the usage count, and the tools of the card:
 * one that collapses or expands every nested card at once, while the card is expanded, and one
 * that reveals the resource in a text editor. While the card is collapsed the IRI is a link that
 * opens it; expanded, it is a field that renames the resource where the document can be written.
 * A blank node shows its identifier, which nothing opens or renames.
 * @param props The resource, the state of the card and what its buttons do.
 * @returns The title bar.
 */
export function ResourceCardTitleBar({ summary, expanded, nestedCollapsed, onToggle, onToggleNested }: ResourceCardTitleBarProps): React.JSX.Element {
	const { readOnly, onOpenExternal, onRenameResource, onRevealInTextEditor } = useFormEditorContext();
	const named = summary.term.termType === 'NamedNode' ? summary.term : undefined;
	const iri = named?.value;
	const written = iri ?? `_:${summary.term.value}`;
	const localPart = summary.localPart;
	const renamed = named && expanded && !readOnly && localPart !== undefined ? onRenameResource : undefined;
	const opened = named && !expanded ? onOpenExternal : undefined;
	const position = summary.position;

	return (
		<div className="resource-card-title-bar">
			<button type="button" className="icon-button resource-card-chevron" aria-expanded={expanded} aria-label={expanded ? 'Collapse' : 'Expand'} title={expanded ? 'Collapse' : 'Expand'} onClick={onToggle}>
				<vscode-icon name={expanded ? 'chevron-down' : 'chevron-right'} size={16}></vscode-icon>
			</button>
			<span className="resource-card-iri" title={iri}>
				{_identifierOf(written, named, localPart, renamed, opened)}
			</span>
			{summary.usageCount !== undefined && <CardUsage count={summary.usageCount} />}
			<span className="resource-card-tools">
				{expanded && (
					<button type="button" className="icon-button" aria-label={nestedCollapsed ? 'Expand all nested' : 'Collapse all nested'} title={nestedCollapsed ? 'Expand all nested' : 'Collapse all nested'} onClick={onToggleNested}>
						<vscode-icon name={nestedCollapsed ? 'expand-all' : 'collapse-all'} size={15}></vscode-icon>
					</button>
				)}
				{position && onRevealInTextEditor && (
					<button type="button" className="icon-button" aria-label="Reveal in editor" title="Reveal in editor" onClick={() => onRevealInTextEditor(position)}>
						<vscode-icon name="code" size={15}></vscode-icon>
					</button>
				)}
			</span>
		</div>
	);
}

/**
 * The identifier of the resource as the title bar shows it: the field of its IRI where the
 * resource can be renamed, a link where the IRI can be opened, else text.
 * @param written The identifier.
 * @param named The resource, where it has an IRI.
 * @param localPart The local part of the IRI, where it has one.
 * @param renamed Renames the resource, where the card allows it.
 * @param opened Opens the IRI, where the card allows it.
 * @returns The identifier.
 */
function _identifierOf(written: string, named: NamedNode | undefined, localPart: string | undefined, renamed: ((resource: NamedNode, iri: string) => void) | undefined, opened: ((iri: string) => void) | undefined): React.JSX.Element {
	if (named && renamed && localPart !== undefined) {
		return <IriField iri={written} namespace={written.slice(0, written.length - localPart.length)} onRename={text => renamed(named, text)} />;
	}

	if (named && opened) {
		return <button type="button" className="resource-card-iri-text resource-card-iri-link" onClick={() => opened(named.value)}>{written}</button>;
	}

	return <span className="resource-card-iri-text">{written}</span>;
}
