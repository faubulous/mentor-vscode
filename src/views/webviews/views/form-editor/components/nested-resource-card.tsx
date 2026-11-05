import { BlankNode, NamedNode } from '@rdfjs/types';
import { MouseEvent, useEffect, useRef } from 'react';
import { VscodeContextMenu } from '@vscode-elements/elements';
import { termToString } from 'rdf-string';
import { NestedResourceRef } from '../form-editor-model';
import { useResourceDetail } from '../hooks/use-resource-detail';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { NestedCardActions, NestedCardMenu } from './nested-card-menu';
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
	visited: readonly (NamedNode | BlankNode)[];

	/**
	 * What the row holding the card can do with the node, which its ⋯ menu and a right-click on it
	 * offer; absent where the row only reads.
	 */
	actions?: NestedCardActions;
}

/**
 * A blank node rendered below the value that refers to it, as a card without a header: it has
 * no identity to lead with and nothing to collapse to, so its statements are what it is. Beyond
 * the nesting limit it is a placeholder that scrolls to the node. Where its row is edited, the card
 * has a ⋯ menu, which a right-click on the card opens too, except in a text field.
 * @param props The blank node and where it stands.
 * @returns The card, or nothing for a node that holds this card already.
 */
export function NestedResourceCard({ nested, dataService, depth, visited, actions }: NestedResourceCardProps): React.JSX.Element | null {
	const { detail, stale } = useResourceDetail(dataService, nested.term);
	const menuRef = useRef<VscodeContextMenu | null>(null);

	// The node is asked for when nothing is known of it, and again after the document changed.
	useEffect(() => {
		if (!detail || stale) {
			dataService.request([nested.term]);
		}
	}, [detail, stale, dataService, nested.term]);

	if (visited.some(resource => resource.equals(nested.term))) {
		return null;
	}

	if (depth > MAX_NESTING_DEPTH) {
		return <NestedResourcePlaceholder nested={nested} />;
	}

	if (!detail) {
		return <div className="resource-card is-nested" data-resource-id={termToString(nested.term)}><div className="resource-form-loading">Loading…</div></div>;
	}

	const handleContextMenu = (event: MouseEvent<HTMLDivElement>): void => {
		if (!menuRef.current || _isTextField(event.target)) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		menuRef.current.show = true;
	};

	return (
		<div className="resource-card is-nested" data-resource-id={termToString(nested.term)} onContextMenu={actions ? handleContextMenu : undefined}>
			{detail.comments && <div className="statement-comment">{detail.comments.join('\n')}</div>}
			<StatementList detail={detail} dataService={dataService} depth={depth} visited={[...visited, nested.term]} />
			{actions && <NestedCardMenu actions={actions} menuRef={menuRef} />}
		</div>
	);
}

/**
 * Indicate whether a right-click is on a text field, which keeps the menu of the browser.
 * @param target The element clicked.
 * @returns `true` within a text field or text area.
 */
function _isTextField(target: EventTarget): boolean {
	return target instanceof Element && target.closest('vscode-textfield, vscode-textarea, input, textarea') !== null;
}
