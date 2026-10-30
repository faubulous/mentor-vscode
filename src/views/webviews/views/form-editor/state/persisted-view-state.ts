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
}

/**
 * The view state persisted across reloads of the webview. Immutable: a change returns the next
 * state. A stored state written by another version of the editor, or half-way through an
 * upgrade, may lack fields or hold them in another form; reading it never breaks the form.
 */
export class PersistedViewState {
	/**
	 * The state of a webview opened for the first time.
	 */
	static readonly INITIAL = new PersistedViewState();

	/**
	 * Create a state.
	 * @param openIds The cards opened persistently.
	 * @param documentUri The document the state belongs to.
	 * @param hideExternalDeclarations Whether external declarations are hidden.
	 */
	constructor(
		readonly openIds: readonly string[] = [],
		readonly documentUri?: string,
		readonly hideExternalDeclarations?: boolean
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
			state.hideExternalDeclarations === true ? true : undefined
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
			'hideExternalDeclarations' in changes ? changes.hideExternalDeclarations : this.hideExternalDeclarations
		);
	}

	/**
	 * The plain form the webview host stores.
	 * @returns The fields.
	 */
	toJSON(): Record<string, unknown> {
		return {
			documentUri: this.documentUri,
			openIds: [...this.openIds],
			hideExternalDeclarations: this.hideExternalDeclarations
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
