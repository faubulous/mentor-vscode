import { MutableRefObject } from 'react';
import { VscodeContextMenu } from '@vscode-elements/elements';
import { ResourceCardHeaderData } from '../form-editor-model';
import { useFormEditorContext } from '../state/form-editor-context';
import { CardUsage } from './card-usage';
import { ResourceCardMenu } from './resource-card-menu';
import { ResourceCardTypes } from './resource-card-types';

/**
 * Properties of the {@link ResourceCardTitleBar} component.
 */
export interface ResourceCardTitleBarProps {
	/**
	 * The resource.
	 */
	cardHeader: ResourceCardHeaderData;

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

	/**
	 * Holds the element of the ⋮ menu, which a right-click on the card opens as well.
	 */
	menuRef: MutableRefObject<VscodeContextMenu | null>;
}

/**
 * The title bar of a card, which stays in view while the card scrolls: the chevron that collapses
 * and expands the card, every type of the resource while the card is collapsed, the usage count,
 * the button that collapses or expands every nested card at once while the card is expanded, and
 * the ⋮ menu: Collapse or Expand, Reveal in Editor, Copy IRI for an IRI, Unpin All while a
 * property is pinned in a scope that can be written, and, where the document can be written,
 * Remove.
 * @param props The resource, the state of the card and what its buttons do.
 * @returns The title bar.
 */
export function ResourceCardTitleBar({ cardHeader, expanded, nestedCollapsed, onToggle, onToggleNested, menuRef }: ResourceCardTitleBarProps): React.JSX.Element {
	const { readOnly, pinScopes = [], onRevealInTextEditor, onUnpinAll, onRemoveResource } = useFormEditorContext();
	const position = cardHeader.position;
	const term = cardHeader.subject;
	const unpinnable = cardHeader.pins?.some(pin => pinScopes.includes(pin.scope)) === true;

	return (
		<div className="resource-card-title-bar">
			<button type="button" className="icon-button resource-card-chevron" aria-expanded={expanded} aria-label={expanded ? 'Collapse' : 'Expand'} title={expanded ? 'Collapse' : 'Expand'} onClick={onToggle}>
				<vscode-icon name={expanded ? 'chevron-down' : 'chevron-right'} size={16}></vscode-icon>
			</button>
			{expanded ? <span className="resource-card-types" /> : <ResourceCardTypes cardHeader={cardHeader} className="resource-card-types" />}
			{expanded && (
				<button type="button" className="icon-button" aria-label={nestedCollapsed ? 'Expand all nested' : 'Collapse all nested'} title={nestedCollapsed ? 'Expand all nested' : 'Collapse all nested'} onClick={onToggleNested}>
					<vscode-icon name={nestedCollapsed ? 'expand-all' : 'collapse-all'} size={15}></vscode-icon>
				</button>
			)}
			{cardHeader.usageCount !== undefined && <CardUsage count={cardHeader.usageCount} />}
			<span className="resource-card-tools">
				<ResourceCardMenu
					state={{
						expanded,
						prefixedName: cardHeader.prefixedName,
						onToggle,
						onReveal: position && onRevealInTextEditor ? () => onRevealInTextEditor(position) : undefined,
						onCopyIri: term.termType === 'NamedNode' ? () => void navigator.clipboard.writeText(term.value) : undefined,
						onUnpinAll: unpinnable && onUnpinAll ? () => onUnpinAll(term) : undefined,
						onRemove: !readOnly && onRemoveResource ? () => onRemoveResource(term) : undefined
					}}
					menuRef={menuRef}
				/>
			</span>
		</div>
	);
}
