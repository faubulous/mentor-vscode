import * as vscode from 'vscode';
import { getConfig } from '@src/utilities/vscode/config';
import { switchEditorView } from '@src/utilities/vscode/editors';
import { FormEditorProvider } from './form-editor-provider';

/**
 * The languages the form editor is offered for, matching the selectors contributed in the
 * manifest. N3 is excluded because its formulas and rules have no form representation.
 */
const FORM_EDITOR_LANGUAGE_IDS = new Set(['turtle', 'trig', 'ntriples', 'nquads']);

/**
 * Opens RDF documents in the form editor when the user configured it as the default view.
 *
 * The manifest contributes the editor with the `option` priority so that VS Code never replaces
 * the text editor on its own. Honouring a default therefore means reopening a document once it
 * appears as text. Only a document that was just opened as text is reopened: switching to a text
 * editor that was already open is the user moving between their tabs, not opening a document,
 * and is left alone, and so is a text editor opened beside a form of the same document, which is
 * a second view of it rather than a document to reopen. An explicit switch back to the text
 * editor, through "Open in Text Editor" or by replacing the form with the text editor, is
 * remembered for the rest of the session, so the choice is not immediately undone.
 */
export class FormEditorDefaultView implements vscode.Disposable {
	private readonly _subscriptions: vscode.Disposable[] = [];

	private readonly _dismissed = new Set<string>();

	private readonly _reopening = new Set<string>();

	/**
	 * The documents shown in text editors when the active editor last changed.
	 */
	private _textTabs = new Set<string>();

	/**
	 * The documents shown in form editors when the active editor last changed.
	 */
	private _formTabs = new Set<string>();

	/**
	 * Create the service and start watching the active editor.
	 */
	constructor() {
		this._rememberTabs();

		this._subscriptions.push(
			vscode.window.onDidChangeActiveTextEditor(editor => void this._onDidChangeActiveTextEditor(editor))
		);
	}

	/**
	 * Remember that the user chose the text editor for a document, so that the configured default
	 * does not immediately reopen the form.
	 * @param uri The document the user switched to the text editor.
	 */
	dismiss(uri: vscode.Uri): void {
		this._dismissed.add(uri.toString());
	}

	dispose(): void {
		for (const subscription of this._subscriptions) {
			subscription.dispose();
		}

		this._subscriptions.length = 0;
	}

	/**
	 * Reopen a document in the form editor when it was just opened as text against the configured
	 * default. The tabs are compared with those of the previous change, which tells a document
	 * that was opened from one that was switched to.
	 * @param editor The text editor that became active, if any.
	 */
	private async _onDidChangeActiveTextEditor(editor?: vscode.TextEditor): Promise<void> {
		const key = editor?.document.uri.toString();
		const wasText = key !== undefined && this._textTabs.has(key);
		const wasForm = key !== undefined && this._formTabs.has(key);

		this._rememberTabs();

		if (!editor || !key || !this._isEnabled() || !this._isCandidate(editor.document, key)) {
			return;
		}

		// A text editor that was already open: the user is switching tabs, not opening a document.
		if (wasText) {
			return;
		}

		// The form was replaced by the text editor, which is the user choosing the text editor.
		if (wasForm && !this._formTabs.has(key)) {
			this._dismissed.add(key);
			return;
		}

		// The form is still open elsewhere: the text editor was opened beside it, as a second view
		// of the same document, and reopening it as a form would only take that view away again.
		if (this._formTabs.has(key)) {
			return;
		}

		this._reopening.add(key);

		try {
			await switchEditorView(editor.document.uri, FormEditorProvider.viewType);
			this._rememberTabs();
		} finally {
			this._reopening.delete(key);
		}
	}

	/**
	 * Indicate whether a document is one the default applies to: an RDF document backed by a
	 * file. An untitled buffer has nothing to reopen, and a reopen loop would fight the user's own
	 * choice.
	 * @param document The document.
	 * @param key The string form of its URI.
	 * @returns `true` when the default applies.
	 */
	private _isCandidate(document: vscode.TextDocument, key: string): boolean {
		return FORM_EDITOR_LANGUAGE_IDS.has(document.languageId)
			&& document.uri.scheme === 'file'
			&& !this._dismissed.has(key)
			&& !this._reopening.has(key);
	}

	/**
	 * Take note of which documents are shown as text and which as forms.
	 */
	private _rememberTabs(): void {
		const textTabs = new Set<string>();
		const formTabs = new Set<string>();

		for (const group of vscode.window.tabGroups.all) {
			for (const tab of group.tabs) {
				if (tab.input instanceof vscode.TabInputText) {
					textTabs.add(tab.input.uri.toString());
				} else if (tab.input instanceof vscode.TabInputCustom && tab.input.viewType === FormEditorProvider.viewType) {
					formTabs.add(tab.input.uri.toString());
				}
			}
		}

		this._textTabs = textTabs;
		this._formTabs = formTabs;
	}

	/**
	 * Indicate whether the form editor is configured as the default view.
	 * @returns `true` when it is.
	 */
	private _isEnabled(): boolean {
		return getConfig().get<string>('formEditor.defaultView') === 'form';
	}
}
