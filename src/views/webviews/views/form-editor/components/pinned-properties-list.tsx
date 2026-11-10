import { KeyboardEvent } from 'react';
import { NamedNode } from '@rdfjs/types';
import { PinnedProperty, PropertyView, ResourceDetail, TermView } from '../form-editor-model';
import { LiteralDatatypes } from '../services/statement/literal-datatypes';
import { useFormEditorContext } from '../state/form-editor-context';
import { LanguageFilter } from '../state/language-filter';
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
	 * Expand the card and go to the row of a property.
	 * @param predicate The predicate of the property.
	 */
	onOpen: (predicate: NamedNode) => void;
}

/**
 * A pinned property the resource has, with its values the form shows.
 */
interface PinnedPropertyItem {
	/**
	 * The pin.
	 */
	pin: PinnedProperty;

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
 * The pinned properties of a collapsed card, as items that flow from left to right: the predicate
 * as a caption, marked when it is pinned for oneself only, above its values. Resources are small
 * pills, numbers monospace, blank nodes and lists a line that names them, and a description runs
 * the full width, cut after two lines. A property the resource does not have is left out, and so
 * is the label the title of the card shows. A click on an item, or Enter on it, expands the card
 * at that property.
 * @param props The statements, the pins and what opens a property.
 * @returns The items, or nothing when the resource has none of the pinned properties.
 */
export function PinnedPropertiesList({ detail, pins, onOpen }: PinnedPropertiesListProps): React.JSX.Element | null {
	const { descriptionPredicates = [], labelPredicates = [], languageFilter = LanguageFilter.ALL } = useFormEditorContext();
	const items = _itemsOf(detail, pins.filter(pin => !_titleOf(detail, labelPredicates)?.equals(pin.predicate)), languageFilter);

	if (items.length === 0) {
		return null;
	}

	return (
		<div className="pinned-properties-list">
			{items.map(({ pin, property, values }) => {
				const description = descriptionPredicates.some(predicate => predicate.equals(pin.predicate));
				const label = getTermLabel(property.predicate);

				const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
					if (event.key === 'Enter' || event.key === ' ') {
						event.preventDefault();
						onOpen(pin.predicate);
					}
				};

				return (
					<div
						key={pin.predicate.value}
						className={`pinned-property${description ? ' is-description' : ''}`}
						role="button"
						tabIndex={0}
						aria-label={`${label}: open the property`}
						title={pin.predicate.value}
						onClick={() => onOpen(pin.predicate)}
						onKeyDown={handleKeyDown}
					>
						<span className="pinned-property-caption">
							{label}
							{pin.scope === 'user' && <vscode-icon name="pin" size={11} title="Pinned for you"></vscode-icon>}
						</span>
						<span className="pinned-property-values">
							{description ? values.map(value => value.term.value).join(' ') : values.map((value, index) => _valueOf(value, index))}
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
 * The pinned properties a resource has, with the values the form shows.
 * @param detail The statements of the resource.
 * @param pins The pins.
 * @param languageFilter Which literals are shown.
 * @returns The items, in the order of the pins.
 */
function _itemsOf(detail: ResourceDetail, pins: readonly PinnedProperty[], languageFilter: LanguageFilter): PinnedPropertyItem[] {
	return pins.flatMap(pin => {
		const property = detail.properties.find(candidate => candidate.predicate.term.equals(pin.predicate));
		const values = property?.values.filter(value => languageFilter.shows(value.term)) ?? [];

		return property && values.length > 0 ? [{ pin, property, values }] : [];
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
