import { MouseEvent, useEffect, useRef } from 'react';
import { TagPickerControl } from '../hooks/use-tag-picker';
import { showInTopLayer } from './combobox';
import { TagPickerTab } from './tag-picker-items';

/**
 * The tabs of the picker, in their order, with their names.
 */
const TABS: readonly { tab: TagPickerTab; name: string }[] = [
	{ tab: 'datatype', name: 'Datatype' },
	{ tab: 'language', name: 'Language' }
];

/**
 * Properties of the {@link TagPicker} component.
 */
export interface TagPickerProps {
	/**
	 * The picker, as the field of the literal drives it.
	 */
	picker: TagPickerControl;

	/**
	 * The identifier of the list of items, which the text of the literal controls.
	 */
	listId: string;
}

/**
 * The identifier of an item of the picker, which the text of the literal names as the active one.
 * @param listId The identifier of the list.
 * @param index The index of the item.
 * @returns The identifier.
 */
export function getTagPickerItemId(listId: string, index: number): string {
	return `${listId}-${index}`;
}

/**
 * The tag picker of a literal: a pop-up under the value with a filter that takes the focus as the
 * picker opens, a Datatype and a Language tab under it, and the list of the items of the tab that
 * match the filter, each its code and what it is. The filter keeps the focus: the tabs and items act
 * on the press of the mouse, whose default is prevented, and the keys pressed in the filter move
 * the highlight. It shows in the top layer of the page, so no card after it covers it.
 * @param props The picker.
 * @returns The pop-up.
 */
export function TagPicker({ picker, listId }: TagPickerProps): React.JSX.Element {
	const listRef = useRef<HTMLDivElement>(null);
	const filterRef = useRef<HTMLInputElement>(null);
	const { tab, items, active, filter } = picker;
	const noun = tab === 'datatype' ? 'datatypes' : 'languages';

	useEffect(() => {
		filterRef.current?.focus();
	}, []);

	useEffect(() => {
		listRef.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
	}, [tab, active]);

	const act = (event: MouseEvent, action: () => void): void => {
		event.preventDefault();
		action();
	};

	return (
		<div ref={showInTopLayer} popover="manual" className="tag-picker">
			<input
				ref={filterRef}
				type="text"
				className="tag-picker-filter"
				role="combobox"
				value={filter}
				placeholder={`Search ${noun}`}
				autoComplete="off"
				spellCheck={false}
				aria-label={`Search ${noun}`}
				aria-expanded={true}
				aria-controls={listId}
				aria-activedescendant={items.length > 0 ? getTagPickerItemId(listId, active) : undefined}
				onChange={event => picker.setFilter(event.currentTarget.value)}
				onKeyDown={picker.handleKeyDown}
			/>
			<div className="tag-picker-tabs" role="tablist" aria-label="Datatype or language">
				{TABS.map(entry => (
					<button
						key={entry.tab}
						type="button"
						role="tab"
						tabIndex={-1}
						className={`tag-picker-tab${entry.tab === tab ? ' is-active' : ''}`}
						aria-selected={entry.tab === tab}
						aria-controls={listId}
						onMouseDown={event => act(event, () => picker.showTab(entry.tab))}
					>
						{entry.name}
					</button>
				))}
			</div>
			<div ref={listRef} id={listId} className="tag-picker-list" role="listbox" aria-label={tab === 'datatype' ? 'Datatypes' : 'Languages'}>
				{items.map((item, index) => (
					<div
						key={item.key}
						id={getTagPickerItemId(listId, index)}
						className={`tag-picker-item${index === active ? ' is-active' : ''}`}
						role="option"
						aria-selected={index === active}
						aria-label={item.description ? `${item.code}, ${item.description}` : item.code}
						onMouseDown={event => act(event, () => picker.pick(item))}
						onMouseEnter={() => picker.highlight(index)}
					>
						<span className="tag-picker-code">{item.code}</span>
						<span className="tag-picker-description">{item.description}</span>
					</div>
				))}
				{items.length === 0 && <div className="tag-picker-empty">No matching {noun}</div>}
			</div>
		</div>
	);
}
