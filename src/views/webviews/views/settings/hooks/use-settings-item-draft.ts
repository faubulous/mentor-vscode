import { Dispatch, SetStateAction, useEffect, useState } from 'react';
import { useVscodeElementRef } from '@src/views/webviews/webview-hooks';

/** A tabbed element exposing its currently selected tab index. */
type TabbedElement = HTMLElement & { selectedIndex: number };

export interface UseSettingsItemDraftOptions<T> {
	/** Called whenever the dirty state changes. */
	onDirtyChange?: (dirty: boolean) => void;

	/** Extra validity gate for enabling Save, beyond "has changes". Defaults to always valid. */
	validate?: (draft: T) => boolean;
}

export interface SettingsItemDraft<T> {
	/** The working copy the editor mutates. */
	draft: T;

	/** Updates the working copy. */
	setDraft: Dispatch<SetStateAction<T>>;

	/** Whether the draft differs from the seeded item. */
	hasChanges: boolean;

	/** Whether Save should be enabled (`hasChanges` && `validate(draft)`). */
	canSave: boolean;

	/** The active `<vscode-tabs>` tab index. */
	activeTab: number;

	/** Ref callback to bind to the `<vscode-tabs>` element so tab changes update `activeTab`. */
	tabsRef: (element: TabbedElement | null) => void;
}

/**
 * Shared modal-editor draft state used by the store and validation profile
 * editors. Seeds a local draft from `item`, reseeds it (and resets the active
 * tab) whenever a different item is opened, tracks a `JSON.stringify` dirty
 * diff, reports it via `onDirtyChange`, derives `canSave`, and wires the
 * `<vscode-tabs>` selection into `activeTab`.
 */
export function useSettingsItemDraft<T>(item: T, options: UseSettingsItemDraftOptions<T> = {}): SettingsItemDraft<T> {
	const { onDirtyChange, validate } = options;

	const [draft, setDraft] = useState<T>(item);
	const [activeTab, setActiveTab] = useState(0);

	// Reseed the draft whenever a different item is opened.
	useEffect(() => {
		setDraft(item);
		setActiveTab(0);
	}, [item]);

	const hasChanges = JSON.stringify(draft) !== JSON.stringify(item);

	useEffect(() => {
		onDirtyChange?.(hasChanges);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [hasChanges]);

	const canSave = hasChanges && (validate ? validate(draft) : true);

	const tabsRef = useVscodeElementRef<TabbedElement>('vsc-tabs-select', element => setActiveTab(element.selectedIndex));

	return { draft, setDraft, hasChanges, canSave, activeTab, tabsRef };
}
