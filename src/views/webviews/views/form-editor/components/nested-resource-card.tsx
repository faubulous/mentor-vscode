import { BlankNode, NamedNode } from '@rdfjs/types';
import { KeyboardEvent, MouseEvent, useEffect, useRef } from 'react';
import { VscodeContextMenu } from '@vscode-elements/elements';
import { termToString } from 'rdf-string';
import { NestedResourceRef } from '../form-editor-model';
import { useResourceDetail } from '../hooks/use-resource-detail';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { FormEditorShortcuts } from '../form-editor-shortcuts';
import { NestedCardActions, NestedCardMenu } from './nested-card-menu';
import { NestedResourcePlaceholder } from './nested-resource-placeholder';
import { PinnedPropertiesContext } from '../state/pinned-properties-context';
import { useFormEditorContext } from '../state/form-editor-context';
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

	/**
	 * The comment lines written above the value that refers to the node.
	 */
	comments?: string[];
}

/**
 * A blank node rendered below the value that refers to it, as a nested card led by its type, with
 * the comment lines written above the value and above the node as the caption of its header, and
 * the pins of the types of the node, which its rows set and its collapsed header shows. Beyond the nesting
 * limit it is a placeholder that scrolls to the node. Where its row is edited, the card
 * has a ⋯ menu, which a right-click on the card opens too, except in a text field.
 * @param props The blank node and where it stands.
 * @returns The card, or nothing for a node that holds this card already.
 */
export function NestedResourceCard({ nested, dataService, depth, visited, actions, comments }: NestedResourceCardProps): React.JSX.Element | null {
	const { detail, stale } = useResourceDetail(dataService, nested.term);
	const { onSetPin } = useFormEditorContext();
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

	// The shortcut of Remove removes the node while the focus is in the header of its card or in no
	// row of it; a row removes itself by it.
	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
		if (!actions || !FormEditorShortcuts.Remove.matches(event) || !_isOwnHeader(event.target, event.currentTarget)) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		actions.onRemove();
	};

	const handleContextMenu = (event: MouseEvent<HTMLDivElement>): void => {
		if (!menuRef.current || _isTextField(event.target)) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		menuRef.current.show = true;
	};

	return (
		<div className="resource-card is-nested" data-resource-id={termToString(nested.term)} onContextMenu={actions ? handleContextMenu : undefined} onKeyDown={actions ? handleKeyDown : undefined}>
			<PinnedPropertiesContext.Provider value={{ pins: detail.pins ?? [], onPin: detail.pins && onSetPin ? (predicate, scope) => onSetPin(nested.term, predicate, scope) : undefined }}>
				<StatementList detail={detail} dataService={dataService} depth={depth} visited={[...visited, nested.term]} comments={_captionOf(comments, detail.comments)} />
			</PinnedPropertiesContext.Provider>
			{actions && <NestedCardMenu actions={actions} menuRef={menuRef} />}
		</div>
	);
}

/**
 * The caption of the header of a nested card: the comment lines written above the value that
 * refers to the node, then those written above the node.
 * @param valueComments The comment lines above the value.
 * @param nodeComments The comment lines above the node.
 * @returns The lines, or `undefined` where there are none.
 */
function _captionOf(valueComments: string[] | undefined, nodeComments: string[] | undefined): string[] | undefined {
	const lines = [...(valueComments ?? []), ...(nodeComments ?? [])];

	return lines.length > 0 ? lines : undefined;
}

/**
 * Indicate whether a right-click is on a text field, which keeps the menu of the browser.
 * @param target The element clicked.
 * @returns `true` within a text field or text area.
 */
function _isTextField(target: EventTarget): boolean {
	return target instanceof Element && target.closest('vscode-textfield, vscode-textarea, input, textarea') !== null;
}

/**
 * Indicate whether the target of an event in a nested card is in the header of that card, or in no
 * row of it, rather than in one of its rows or in a card nested in it.
 * @param target The target of the event.
 * @param card The nested card.
 * @returns `true` when the card itself is meant.
 */
function _isOwnHeader(target: EventTarget, card: Element): boolean {
	if (!(target instanceof Element) || target.closest('.resource-card.is-nested') !== card) {
		return false;
	}

	const row = target.closest('.statement-line');

	return !row || !card.contains(row) || row.classList.contains('is-card-header');
}
