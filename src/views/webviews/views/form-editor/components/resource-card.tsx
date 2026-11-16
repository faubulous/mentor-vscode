import { KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { ResourceCardHeaderData } from '../form-editor-model';
import { useContextMenu } from '../hooks/use-context-menu';
import { useResourceCardBody } from '../hooks/use-resource-card-body';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { FormEditorShortcuts } from '../form-editor-shortcuts';
import { NestedCardsCollapse, NestedCardsCollapseContext } from '../state/nested-cards-collapse-context';
import { PinnedProperties, PinnedPropertiesContext } from '../state/pinned-properties-context';
import { useFormEditorContext } from '../state/form-editor-context';
import { HighlightedText } from './highlighted-text';
import { PinnedPropertiesList } from './pinned-properties-list';
import { ResourceCardFooter } from './resource-card-footer';
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
	cardHeader: ResourceCardHeaderData;

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
	 * Expands the card or collapses it again.
	 */
	onToggle: (resource: NamedNode | BlankNode) => void;
}

/**
 * One resource of the document as a card of the list, led by its title bar, which stays in view
 * while the card scrolls, and ended by its footer with the IRI, which stays in view at the bottom
 * while the card is expanded. Collapsed, the label row is the clickable area: the icon of the kind
 * of the resource and the label; the properties pinned for the types of the resource and its
 * description follow as fields in the order the document writes them, which open the card at their
 * property. Expanded, the card is its statements, led by the label row, whose rows pin their
 * properties, and ends with the link that adds a property. The title bar asks the nested cards of
 * the card to collapse or expand all at once. A right-click on the card opens its ⋮ menu, unless a
 * row or a nested card under the pointer opens its own.
 * @param props The resource and its state.
 * @returns The card.
 */
export function ResourceCard({ cardHeader, dataService, expanded, writing = false, current, onToggle }: ResourceCardProps): React.JSX.Element {
	const { revealedResource, filterText, readOnly, onSetPin, onRemoveResource } = useFormEditorContext();
	const { cardBody, stale } = useResourceCardBody(dataService, cardHeader.subject);
	const marked = current === true || revealedResource?.equals(cardHeader.subject) === true;
	const toggle = useCallback((): void => onToggle(cardHeader.subject), [onToggle, cardHeader.subject]);
	const showsStatements = expanded || writing;
	const [nestedCollapse, setNestedCollapse] = useState<NestedCardsCollapse>({ collapsed: true, revision: 0 });
	const toggleNested = useCallback((): void => setNestedCollapse(current => ({ collapsed: !current.collapsed, revision: current.revision + 1 })), []);
	const pins = useMemo<PinnedProperties>(() => ({
		pins: cardHeader.pins ?? [],
		onPin: cardHeader.pins && onSetPin ? (predicate, scope) => onSetPin(cardHeader.subject, predicate, scope) : undefined
	}), [cardHeader.pins, cardHeader.subject, onSetPin]);
	const showsPins = !expanded && pins.pins.length > 0;
	const [openedPredicate, setOpenedPredicate] = useState<NamedNode>();
	const cardRef = useRef<HTMLElement>(null);
	const { menuRef, openOnContextMenu } = useContextMenu();

	// A card showing its statements, or the pinned ones while collapsed, holds them current,
	// wherever the list is scrolled to.
	useEffect(() => {
		if ((showsStatements || showsPins) && (!cardBody || stale)) {
			dataService.request([cardHeader.subject]);
		}
	}, [showsStatements, showsPins, cardBody, stale, dataService, cardHeader.subject]);

	// A pinned field opens the card at the row of its property, once the rows are there.
	useEffect(() => {
		const row = openedPredicate && expanded && cardBody ? cardRef.current?.querySelector<HTMLElement>(`.resource-card-body [data-predicate="${CSS.escape(openedPredicate.value)}"]`) : undefined;

		if (row) {
			setOpenedPredicate(undefined);
			row.focus();
			row.scrollIntoView({ block: 'nearest' });
		}
	}, [openedPredicate, expanded, cardBody]);

	// The shortcut of Remove removes the card while the focus is in it but in none of its rows,
	// which remove themselves by it.
	const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
		if (!FormEditorShortcuts.Remove.matches(event) || readOnly || !onRemoveResource || (event.target instanceof Element && event.target.closest('.statement-line'))) {
			return;
		}

		event.preventDefault();
		onRemoveResource(cardHeader.subject);
	};

	const openAt = useCallback((predicate: NamedNode): void => {
		setOpenedPredicate(predicate);
		onToggle(cardHeader.subject);
	}, [onToggle, cardHeader.subject]);

	return (
		<article ref={cardRef} onKeyDown={handleKeyDown} onContextMenu={openOnContextMenu} className={`resource-card${expanded ? ' is-expanded' : ''}${marked ? ' is-current' : ''}`} data-resource-id={termToString(cardHeader.subject)}>
			<ResourceCardTitleBar cardHeader={cardHeader} expanded={expanded} nestedCollapsed={nestedCollapse.collapsed} onToggle={toggle} onToggleNested={toggleNested} menuRef={menuRef} />
			{(!expanded || !cardBody) && <ResourceCardHeader cardHeader={cardHeader} expanded={expanded} onToggle={toggle} />}
			{showsPins && cardBody && <PinnedPropertiesList cardBody={cardBody} pins={pins.pins} onOpen={openAt} />}
			{!expanded && cardHeader.description && !(showsPins && cardBody) && <div className="resource-card-description"><HighlightedText text={cardHeader.description} query={filterText} /></div>}
			{showsStatements && (
				<PinnedPropertiesContext.Provider value={pins}>
					<NestedCardsCollapseContext.Provider value={nestedCollapse}>
						<div className="resource-card-body" hidden={!expanded}>
							{cardBody
								? <StatementList cardBody={cardBody} stale={stale} dataService={dataService} depth={0} visited={[cardHeader.subject]} labelRow />
								: <div className="resource-form-loading">Loading…</div>}
						</div>
					</NestedCardsCollapseContext.Provider>
				</PinnedPropertiesContext.Provider>
			)}
			<ResourceCardFooter cardHeader={cardHeader} expanded={expanded} />
		</article>
	);
}
