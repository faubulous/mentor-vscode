import { KeyboardEvent } from 'react';
import { NamedNode } from '@rdfjs/types';
import { PinnedProperty, PropertyView, ResourceDetail, TermView } from '../form-editor-model';
import { LiteralDatatypes } from '../services/statement/literal-datatypes';
import { useFormEditorContext } from '../state/form-editor-context';
import { LanguageFilter } from '../state/language-filter';
import { HighlightedText } from './highlighted-text';
import { getResourceTooltipAttributes } from './resource-tooltip';
import { getTermLabel } from './term-labels';
import { ValuePill } from './value-pill';

/**
 * Properties of the {@link PinnedPropertiesList} component.
 */
export interface PinnedPropertiesListProps {
	/**
	 * The statements of the resource.
	 */
	detail: ResourceDetail;

	/**
	 * The properties pinned for the types of the resource, in order.
	 */
	pins: readonly PinnedProperty[];

	/**
	 * Expand the card and go to the row of a property; absent where the items open nothing, as in
	 * the compact card of a tooltip.
	 * @param predicate The predicate of the property.
	 */
	onOpen?: (predicate: NamedNode) => void;
}

/**
 * A property a collapsed card shows, with its values the form shows: a pinned one, or the
 * description of the resource.
 */
interface PinnedPropertyItem {
	/**
	 * The pin, absent for the description, which the card shows unpinned.
	 */
	pin?: PinnedProperty;

	/**
	 * The property.
	 */
	property: PropertyView;

	/**
	 * The values shown, those of other languages left out.
	 */
	values: TermView[];
}

/**
 * The pinned properties of a collapsed card and its description, in the order the document writes
 * them, as items that flow from left to right: the predicate as a caption, marked when it is
 * pinned for oneself only, above its values. Resources are small pills, numbers monospace, blank
 * nodes and lists a line that names them. A description runs the full width, cut after a few
 * lines; the description of the resource, which the card shows pinned or not, has no caption. A
 * property the resource does not have is left out, and so is the label the title of the card
 * shows. Where the card can open, a click on an item, or Enter on it, expands the card at that
 * property.
 * @param props The statements, the pins and what opens a property.
 * @returns The items, or nothing when the resource has neither a pinned property nor a description.
 */
export function PinnedPropertiesList({ detail, pins, onOpen }: PinnedPropertiesListProps): React.JSX.Element | null {
	const { descriptionPredicates = [], labelPredicates = [], languageFilter = LanguageFilter.ALL, filterText } = useFormEditorContext();
	const title = _titleOf(detail, labelPredicates);
	const items = _itemsOf(detail, pins.filter(pin => !title?.equals(pin.predicate)), descriptionPredicates, languageFilter);

	if (items.length === 0) {
		return null;
	}

	return (
		<div className="pinned-properties-list">
			{items.map(({ pin, property, values }) => {
				const predicate = property.predicate.term as NamedNode;
				const description = descriptionPredicates.some(candidate => candidate.equals(predicate));
				const label = getTermLabel(property.predicate);
				const text = values.map(value => value.term.value).join(' ');

				const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						onOpen?.(predicate);
					}
				};

				return (
					<div
						key={predicate.value}
						className={`pinned-property${description ? ' is-description' : ''}${pin ? '' : ' is-unpinned'}`}
						role={onOpen ? 'button' : undefined}
						tabIndex={onOpen ? 0 : undefined}
						aria-label={onOpen ? `${label}: open the property` : undefined}
						onClick={onOpen ? () => onOpen(predicate) : undefined}
						onKeyDown={onOpen ? handleKeyDown : undefined}
					>
						{pin && (
							<span className="pinned-property-caption" {...getResourceTooltipAttributes(predicate)}>
								{label}
								{pin.scope === 'user' && <vscode-icon name="pin" size={11} title="Pinned for you"></vscode-icon>}
							</span>
						)}
						<span className="pinned-property-values">
							{description ? <HighlightedText text={text} query={filterText} /> : values.map((value, index) => _valueOf(value, index))}
						</span>
					</div>
				);
			})}
		</div>
	);
}

/**
 * The label predicate the title of a card shows: the most preferred one the resource has.
 * @param detail The statements of the resource.
 * @param labelPredicates The label predicates, most preferred first.
 * @returns The predicate, or `undefined` for a resource without a label.
 */
function _titleOf(detail: ResourceDetail, labelPredicates: readonly NamedNode[]): NamedNode | undefined {
	return labelPredicates.find(predicate => detail.properties.some(property => property.predicate.term.equals(predicate)));
}

/**
 * The pinned properties a resource has and its description, the most preferred description
 * predicate it has, with the values the form shows, in the order the document writes them.
 * @param detail The statements of the resource.
 * @param pins The pins.
 * @param descriptionPredicates The description predicates, most preferred first.
 * @param languageFilter Which literals are shown.
 * @returns The items, in document order.
 */
function _itemsOf(detail: ResourceDetail, pins: readonly PinnedProperty[], descriptionPredicates: readonly NamedNode[], languageFilter: LanguageFilter): PinnedPropertyItem[] {
	const shown = (property: PropertyView): TermView[] => property.values.filter(value => languageFilter.shows(value.term));
	const description = descriptionPredicates
		.map(predicate => detail.properties.find(property => property.predicate.term.equals(predicate)))
		.find(property => property !== undefined && shown(property).length > 0);

	return detail.properties.flatMap(property => {
		const pin = pins.find(candidate => property.predicate.term.equals(candidate.predicate));
		const values = shown(property);

		return (pin || property === description) && values.length > 0 ? [{ pin, property, values }] : [];
	});
}

/**
 * One value of a pinned property: a resource as a small pill, a blank node or a list as a line that
 * names it, a number monospace, any other literal as its text.
 * @param view The value.
 * @param index The index of the value in the item.
 * @returns The value.
 */
function _valueOf(view: TermView, index: number): React.JSX.Element {
	if (view.collection) {
		return <span key={index} className="pinned-property-value">({view.collection.items.map(item => getTermLabel(item)).join(', ')})</span>;
	}

	if (view.nested) {
		const name = view.nested.label ?? view.nested.typeLabel ?? 'blank node';

		return <span key={index} className="pinned-property-value is-node">[ {name} · {view.nested.propertyCount} {view.nested.propertyCount === 1 ? 'property' : 'properties'} ]</span>;
	}

	if (view.term.termType === 'Literal') {
		const numeric = LiteralDatatypes.isNumeric(view.term.datatype.value);

		return <span key={index} className={`pinned-property-value${numeric ? ' is-numeric' : ''}`}>{view.term.value}</span>;
	}

	return <ValuePill key={index} view={view} />;
}
