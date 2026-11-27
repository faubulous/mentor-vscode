import { BlankNode, NamedNode } from '@rdfjs/types';
import { KeyboardEvent, ReactNode, useEffect } from 'react';
import { termToString } from 'rdf-string';
import { NestedResourceData } from '../form-editor-model';
import { useContextMenu } from '../hooks/use-context-menu';
import { useResourceCardBody } from '../hooks/use-resource-card-body';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { FormEditorShortcuts } from '../form-editor-shortcuts';
import { NestedCardActions, NestedCardMenu } from './nested-card-menu';
import { NestedResourcePlaceholder } from './nested-resource-placeholder';
import { PinnedPropertiesContext } from '../state/pinned-properties-context';
import { useFormEditorContext } from '../state/form-editor-context';
import { StatementList } from './statement-list';
import { CommentField } from './comment-field';
import { getCommentTarget } from '../state/comment-editor';

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
	nested: NestedResourceData;

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
 * A blank node rendered below the value that refers to it, as a nested card led by its type, with
 * the comment written at the head of the node as the caption of its header, edited in place, and
 * the pins of the types of the node, which its rows set and its collapsed header shows. Beyond the nesting
 * limit it is a placeholder that scrolls to the node. Where its row is edited, the card
 * has a ⋯ menu, which a right-click on the card opens too, except in a text field.
 * @param props The blank node and where it stands.
 * @returns The card, or nothing for a node that holds this card already.
 */
export function NestedResourceCard({ nested, dataService, depth, visited, actions }: NestedResourceCardProps): React.JSX.Element | null {
	const { cardBody, stale } = useResourceCardBody(dataService, nested.term);
	const pins = dataService.getCardHeader?.(nested.term)?.pins;
	const { onSetPin } = useFormEditorContext();
	const { menuRef, openOnContextMenu } = useContextMenu();

	// The node is asked for when nothing is known of it, and again after the document changed.
	useEffect(() => {
		if (!cardBody || stale) {
			dataService.request([nested.term]);
		}
	}, [cardBody, stale, dataService, nested.term]);

	if (visited.some(resource => resource.equals(nested.term))) {
		return null;
	}

	if (depth > MAX_NESTING_DEPTH) {
		return <NestedResourcePlaceholder nested={nested} />;
	}

	if (!cardBody) {
		return <div className="resource-card is-nested" data-resource-id={termToString(nested.term)}><div className="resource-form-loading">Loading…</div></div>;
	}

	// The shortcut of Remove removes the node, and the one of Comment opens the comment above it,
	// while the focus is in the header of its card or in no row of it; a row acts on itself by them.
	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
		if (!actions || !_isOwnHeader(event.target, event.currentTarget)) {
			return;
		}

		if (FormEditorShortcuts.Remove.matches(event)) {
			event.preventDefault();
			event.stopPropagation();
			actions.onRemove();
		} else if (FormEditorShortcuts.Comment.matches(event) && actions.onComment && !(event.target instanceof Element && event.target.closest('.comment-field'))) {
			event.preventDefault();
			event.stopPropagation();
			actions.onComment();
		}
	};

	return (
		<div className="resource-card is-nested" data-resource-id={termToString(nested.term)} onContextMenu={actions ? openOnContextMenu : undefined} onKeyDown={actions ? handleKeyDown : undefined}>
			<PinnedPropertiesContext.Provider value={{ pins: pins ?? [], onPin: pins && onSetPin ? (predicate, scope) => onSetPin(nested.term, predicate, scope) : undefined }}>
				<StatementList cardBody={cardBody} dataService={dataService} depth={depth} visited={[...visited, nested.term]} caption={_captionOf(cardBody.leadingComments, { nested, visited, version: dataService.version })} />
			</PinnedPropertiesContext.Provider>
			{actions && <NestedCardMenu actions={actions} menuRef={menuRef} />}
		</div>
	);
}

/**
 * The caption of the header of a nested card: the comment written at the head of the node, before
 * its first statement. The comment written above the value that refers to the node stands above
 * the card, as the comments of other values do.
 * @param nodeComments The comment lines at the head of the node.
 * @param where The node, the resources holding its card and the document version.
 * @returns The caption, or `undefined` where there is no comment.
 */
function _captionOf(nodeComments: string[] | undefined, where: { nested: NestedResourceData; visited: readonly (NamedNode | BlankNode)[]; version: number }): ReactNode {
	const { nested, visited, version } = where;

	return nodeComments
		? <CommentField className="nested-card-caption-text" label="Comment on the node" lines={nodeComments} target={getCommentTarget({ kind: 'node', subject: nested.term })} subject={nested.term} card={visited[0] ?? nested.term} version={version} />
		: undefined;
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
