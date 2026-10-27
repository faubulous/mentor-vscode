/**
 * The view state persisted across reloads of the webview.
 */
export interface PersistedViewState {
	/**
	 * The shape of the state, raised when it changes.
	 */
	version: 1;

	/**
	 * The document the state belongs to.
	 */
	documentUri?: string;

	/**
	 * The cards opened persistently, by the chevron. Transient opens are not remembered.
	 */
	openIds: string[];

	/**
	 * Whether the terms of other vocabularies the document only declares are hidden. A
	 * preference, kept across documents.
	 */
	hideExternalDeclarations?: boolean;

	/**
	 * Whether the open definitions can be edited; they are only read until Edit is chosen.
	 */
	mode?: 'view' | 'edit';
}

/**
 * The state of a webview opened for the first time.
 */
export const INITIAL_VIEW_STATE: PersistedViewState = { version: 1, openIds: [] };

/**
 * Read a stored view state of any shape. A state written by another version of the editor, or
 * half-way through an upgrade, may lack fields or hold them in another form; neither must break
 * the form.
 * @param stored What the webview host returned, which may be anything.
 * @returns The state, with every field the stored one lacks at its initial value.
 */
export function readViewState(stored: unknown): PersistedViewState {
	if (!stored || typeof stored !== 'object') {
		return INITIAL_VIEW_STATE;
	}

	const state = stored as Record<string, unknown>;

	return {
		version: 1,
		documentUri: typeof state.documentUri === 'string' ? state.documentUri : undefined,
		openIds: _stringArray(state.openIds) ?? [],
		hideExternalDeclarations: state.hideExternalDeclarations === true ? true : undefined,
		mode: state.mode === 'edit' ? 'edit' : undefined
	};
}

/**
 * Read an array of strings, or nothing when the value is not one.
 * @param value The stored value.
 * @returns The strings, or `undefined`.
 */
function _stringArray(value: unknown): string[] | undefined {
	return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : undefined;
}
