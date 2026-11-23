import { KeyboardEvent, useMemo, useState } from 'react';
import { filterLiteralAnnotationPickerItems, getDatatypeItems, getLanguageItems, getLiteralAnnotationItemKey, ResourceItemPosition, LiteralAnnotationPickerSelection, LiteralAnnotationPickerItemData, LiteralAnnotationPickerTab } from '../components/literal-annotation-picker-items';
import { useFormEditorContext } from '../state/form-editor-context';
import { LanguageFilter } from '../state/language-filter';
import { LiteralAnnotation } from '../state/literal-annotation';
import { useTermOptions } from './use-term-options';
import { useWorkspaceLanguages } from './use-workspace-languages';

/**
 * The tab the open picker shows, and the item it highlights, by its key.
 */
interface OpenPicker {
	/**
	 * The tab shown.
	 */
	tab: LiteralAnnotationPickerTab;

	/**
	 * The key of the highlighted item; the first item is highlighted where no item has it.
	 */
	activeKey?: string;

	/**
	 * The text typed into the filter.
	 */
	filter: string;
}

/**
 * What the annotation picker of a literal is told.
 */
export interface LiteralAnnotationPickerOptions {
	/**
	 * The annotation of the literal, which the picker highlights, or `resource` for a value that is a
	 * resource now.
	 */
	current: LiteralAnnotation | 'resource';

	/**
	 * The languages of the card, offered before those of the workspace.
	 */
	languages: readonly string[];

	/**
	 * The position of the item that makes the value a resource in the Datatype tab: first, or after
	 * the datatypes the literal fields offer; absent where the tab does not offer it.
	 */
	resourceItemPosition?: ResourceItemPosition;

	/**
	 * Called with what the item picked gives the literal.
	 */
	onPick: (selection: LiteralAnnotationPickerSelection) => void;

	/**
	 * Called when the picker is done with, by a pick or by Escape, so the text of the literal takes
	 * the focus back.
	 */
	onDone: () => void;
}

/**
 * The annotation picker of a literal, as its field drives it: whether it is open, the tab it shows with
 * its items and the highlighted one, and what the field does with it.
 */
export interface LiteralAnnotationPickerControl {
	/**
	 * Whether the picker is open.
	 */
	open: boolean;

	/**
	 * The tab shown.
	 */
	tab: LiteralAnnotationPickerTab;

	/**
	 * The items of the tab that match the filter, best first.
	 */
	items: readonly LiteralAnnotationPickerItemData[];

	/**
	 * The text typed into the filter.
	 */
	filter: string;

	/**
	 * Take the text typed into the filter, which highlights the best match.
	 * @param filter The text.
	 */
	setFilter: (filter: string) => void;

	/**
	 * The index of the highlighted item.
	 */
	active: number;

	/**
	 * Open the picker on the tab of the literal, or close it, as the annotation of the literal does.
	 */
	toggle: () => void;

	/**
	 * Close the picker.
	 */
	close: () => void;

	/**
	 * Show a tab.
	 * @param tab The tab.
	 */
	showTab: (tab: LiteralAnnotationPickerTab) => void;

	/**
	 * Highlight an item, as pointing at it does.
	 * @param index The index of the item.
	 */
	highlight: (index: number) => void;

	/**
	 * Pick an item and close the picker.
	 * @param item The item.
	 */
	pick: (item: LiteralAnnotationPickerItemData) => void;

	/**
	 * Handle a key pressed in the filter: ↑ and ↓ move the highlight round the items, ← and →
	 * switch the tabs while the filter is empty, Enter and Tab pick the highlighted item, Escape
	 * closes the picker.
	 * @param event The event.
	 * @returns `true` when the picker took the key.
	 */
	handleKeyDown: (event: KeyboardEvent) => boolean;
}

/**
 * The annotation picker of a literal: one pop-up with a Datatype and a Language tab and a filter. It opens
 * on the tab of the literal with its annotation highlighted, and highlights the language the form shows
 * where the literal has none, which the Language tab offers first, before the languages of the
 * card and of the workspace; typing into the filter narrows both tabs to the matches and
 * highlights the best one. The datatypes and languages of the workspace are asked for once the
 * picker opens, the datatypes as the filter is typed.
 * @param options The annotation of the literal, the languages of the card, and what to do with a pick.
 * @returns The picker.
 */
export function useLiteralAnnotationPicker(options: LiteralAnnotationPickerOptions): LiteralAnnotationPickerControl {
	const { current, languages, resourceItemPosition, onPick, onDone } = options;
	const { languageFilter = LanguageFilter.ALL } = useFormEditorContext();
	const [openPicker, setOpenPicker] = useState<OpenPicker>();
	const open = openPicker !== undefined;
	const tab = openPicker?.tab ?? 'datatype';
	const filter = openPicker?.filter ?? '';
	const storeDatatypes = useTermOptions(open ? 'datatype' : undefined, filter, open);
	const workspaceLanguages = useWorkspaceLanguages(open);
	const items = useMemo(() => {
		const selected = languageFilter.language ? [languageFilter.language] : [];
		const all = tab === 'datatype' ? getDatatypeItems(storeDatatypes, resourceItemPosition) : getLanguageItems([...selected, ...languages, ...workspaceLanguages]);

		return filterLiteralAnnotationPickerItems(all, filter, tab);
	}, [tab, filter, storeDatatypes, languages, workspaceLanguages, resourceItemPosition, languageFilter]);
	const active = Math.max(0, items.findIndex(item => item.key === openPicker?.activeKey));

	// A tab opens with the annotation of the literal highlighted, a filter with its best match.
	const openTab = (next: LiteralAnnotationPickerTab, text: string): void => setOpenPicker({ tab: next, filter: text, activeKey: text ? undefined : _initialKeyOf(next, current, languageFilter) });
	const showTab = (next: LiteralAnnotationPickerTab): void => openTab(next, filter);
	const close = (): void => setOpenPicker(undefined);
	const highlight = (index: number): void => setOpenPicker({ tab, filter, activeKey: items[index]?.key });
	const setFilter = (text: string): void => setOpenPicker({ tab, filter: text });

	// The focus goes back to the value before the pick, which may move it on, as to a resource made of the value.
	const pick = (item: LiteralAnnotationPickerItemData): void => {
		close();
		onDone();
		onPick(item.selection);
	};

	const handleKeyDown = (event: KeyboardEvent): boolean => {
		const action = open ? _actionOf(event, filter) : undefined;

		if (!action) {
			return false;
		}

		event.preventDefault();
		event.stopPropagation();

		switch (action) {
			case 'next':
			case 'previous':
				highlight((active + (action === 'next' ? 1 : -1) + items.length) % Math.max(1, items.length));
				break;
			case 'switch':
				showTab(tab === 'datatype' ? 'language' : 'datatype');
				break;
			case 'pick':
				if (items[active]) {
					pick(items[active]);
				}
				break;
			default:
				close();
				onDone();
		}

		return true;
	};

	return {
		open,
		tab,
		items,
		filter,
		setFilter,
		active,
		toggle: () => open ? close() : openTab(current !== 'resource' && current.language ? 'language' : 'datatype', ''),
		close,
		showTab,
		highlight,
		pick,
		handleKeyDown
	};
}

/**
 * What a key does in the filter of the open picker: ← and → move the caret in a filter with text.
 * @param event The event.
 * @param filter The text typed into the filter.
 * @returns The action, or `undefined` for a key the picker leaves to the filter.
 */
function _actionOf(event: KeyboardEvent, filter: string): 'next' | 'previous' | 'switch' | 'pick' | 'close' | undefined {
	switch (event.key) {
		case 'ArrowDown':
			return 'next';
		case 'ArrowUp':
			return 'previous';
		case 'ArrowLeft':
		case 'ArrowRight':
			return filter === '' ? 'switch' : undefined;
		case 'Enter':
		case 'Tab':
			return event.shiftKey ? undefined : 'pick';
		case 'Escape':
			return 'close';
		default:
			return undefined;
	}
}

/**
 * The item a tab highlights as it opens: the annotation of the literal where the tab has it, or the
 * resource item for a value that is a resource, else on the Language tab the language the card
 * shows, else string on the Datatype tab.
 * @param tab The tab.
 * @param current The annotation of the literal, or `resource`.
 * @param languageFilter The language the card shows.
 * @returns The key of the item, or `undefined` for the first item.
 */
function _initialKeyOf(tab: LiteralAnnotationPickerTab, current: LiteralAnnotation | 'resource', languageFilter: LanguageFilter): string | undefined {
	if (tab === 'datatype') {
		return getLiteralAnnotationItemKey(current !== 'resource' && current.language ? {} : current);
	}

	const language = (current === 'resource' ? undefined : current.language) ?? languageFilter.language;

	return language ? getLiteralAnnotationItemKey({ language }) : undefined;
}
