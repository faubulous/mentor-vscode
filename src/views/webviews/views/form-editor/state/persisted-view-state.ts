/**
 * Whether the open definitions can be edited; they are only read until Edit is chosen.
 */
export type ViewMode = 'view' | 'edit';

/**
 * The fields of the view state that can change.
 */
export interface ViewStateChanges {
	/**
	 * The document the state belongs to.
	 */
	documentUri?: string;

	/**
	 * The cards opened persistently, by the chevron. Transient opens are not remembered.
	 */
	openIds?: readonly string[];

	/**
	 * Whether the terms of other vocabularies the document only declares are hidden. A
	 * preference, kept across documents.
	 */
	hideExternalDeclarations?: boolean;

	/**
	 * Whether the open definitions can be edited.
	 */
	mode?: ViewMode;
}

/**
 * The view state persisted across reloads of the webview. Immutable: a change returns the next
 * state. A stored state written by another version of the editor, or half-way through an
 * upgrade, may lack fields or hold them in another form; reading it never breaks the form.
 */
export class PersistedViewState {
	/**
	 * The shape of the stored state, raised when it changes.
	 */
	static readonly VERSION = 1;

	/**
	 * The state of a webview opened for the first time.
	 */
	static readonly INITIAL = new PersistedViewState();

	/**
	 * Create a state.
	 * @param openIds The cards opened persistently.
	 * @param documentUri The document the state belongs to.
	 * @param hideExternalDeclarations Whether external declarations are hidden.
	 * @param mode Whether the open definitions can be edited.
	 */
	constructor(
		readonly openIds: readonly string[] = [],
		readonly documentUri?: string,
		readonly hideExternalDeclarations?: boolean,
		readonly mode?: ViewMode
	) { }

	/**
	 * Read a stored view state of any shape.
	 * @param stored What the webview host returned, which may be anything.
	 * @returns The state, with every field the stored one lacks at its initial value.
	 */
	static read(stored: unknown): PersistedViewState {
		if (!stored || typeof stored !== 'object') {
			return PersistedViewState.INITIAL;
		}

		const state = stored as Record<string, unknown>;

		return new PersistedViewState(
			_stringArray(state.openIds) ?? [],
			typeof state.documentUri === 'string' ? state.documentUri : undefined,
			state.hideExternalDeclarations === true ? true : undefined,
			state.mode === 'edit' ? 'edit' : undefined
		);
	}

	/**
	 * Change some fields.
	 * @param changes The fields and their new values.
	 * @returns The next state.
	 */
	with(changes: ViewStateChanges): PersistedViewState {
		return new PersistedViewState(
			changes.openIds ?? this.openIds,
			'documentUri' in changes ? changes.documentUri : this.documentUri,
			'hideExternalDeclarations' in changes ? changes.hideExternalDeclarations : this.hideExternalDeclarations,
			'mode' in changes ? changes.mode : this.mode
		);
	}

	/**
	 * The plain form the webview host stores.
	 * @returns The fields with the version of their shape.
	 */
	toJSON(): Record<string, unknown> {
		return {
			version: PersistedViewState.VERSION,
			documentUri: this.documentUri,
			openIds: [...this.openIds],
			hideExternalDeclarations: this.hideExternalDeclarations,
			mode: this.mode
		};
	}
}

/**
 * Read an array of strings, or nothing when the value is not one.
 * @param value The stored value.
 * @returns The strings, or `undefined`.
 */
function _stringArray(value: unknown): string[] | undefined {
	return Array.isArray(value) && value.every(item => typeof item === 'string') ? value : undefined;
}
