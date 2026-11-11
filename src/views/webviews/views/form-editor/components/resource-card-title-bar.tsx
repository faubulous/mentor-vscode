import { ResourceSummary } from '../form-editor-model';
import { useFormEditorContext } from '../state/form-editor-context';
import { CardUsage } from './card-usage';
import { ResourceCardMenu } from './resource-card-menu';

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
 * and expands the card, the types of the resource while the card is collapsed, except the type most
 * resources have, the usage count, the button that collapses or expands every nested card at once
 * while the card is expanded, and the ⋯ menu with Reveal in Editor and, where the document can be
 * written, Remove.
 * @param props The resource, the state of the card and what its buttons do.
 * @returns The title bar.
 */
export function ResourceCardTitleBar({ summary, expanded, nestedCollapsed, onToggle, onToggleNested }: ResourceCardTitleBarProps): React.JSX.Element {
	const { readOnly, onRevealInTextEditor, onRemoveResource } = useFormEditorContext();
	const position = summary.position;
	const types = expanded ? [] : _typeLabelsOf(summary);

	return (
		<div className="resource-card-title-bar">
			<button type="button" className="icon-button resource-card-chevron" aria-expanded={expanded} aria-label={expanded ? 'Collapse' : 'Expand'} title={expanded ? 'Collapse' : 'Expand'} onClick={onToggle}>
				<vscode-icon name={expanded ? 'chevron-down' : 'chevron-right'} size={16}></vscode-icon>
			</button>
			<span className="resource-card-types" title={types.join(', ') || undefined}>{types.join(', ')}</span>
			{expanded && (
				<button type="button" className="icon-button" aria-label={nestedCollapsed ? 'Expand all nested' : 'Collapse all nested'} title={nestedCollapsed ? 'Expand all nested' : 'Collapse all nested'} onClick={onToggleNested}>
					<vscode-icon name={nestedCollapsed ? 'expand-all' : 'collapse-all'} size={15}></vscode-icon>
				</button>
			)}
			{summary.usageCount !== undefined && <CardUsage count={summary.usageCount} />}
			<span className="resource-card-tools">
				<ResourceCardMenu
					actions={{
						onReveal: position && onRevealInTextEditor ? () => onRevealInTextEditor(position) : undefined,
						onRemove: !readOnly && onRemoveResource ? () => onRemoveResource(summary.term) : undefined
					}}
				/>
			</span>
		</div>
	);
}

/**
 * The types the title bar of a collapsed card names: every type of the resource.
 * @param summary The resource.
 * @returns The labels of the types, each once.
 */
function _typeLabelsOf(summary: ResourceSummary): string[] {
	const labels = summary.typeLabels ?? (summary.typeLabel ? [summary.typeLabel] : []);

	return Array.from(new Set(labels));
}
