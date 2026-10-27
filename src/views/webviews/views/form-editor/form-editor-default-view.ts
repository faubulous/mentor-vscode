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
 * the text editor on its own. Honouring a default therefore means reopening a document once a
 * text editor tab opens for it. Only an opening tab is reopened: switching to a text editor that
 * is already open is the user moving between their tabs, and is left alone. So is a text editor
 * that opens while a form of the same document is open: it is either a second view of the
 * document, or the text editor VS Code opens before it closes the form when the user reopens the
 * document with the text editor; reopening it as a form would only undo what the user did. An
 * explicit switch back to the text editor through "Open in Text Editor" is remembered for the
 * rest of the session, so the choice is not undone the next time the document opens.
 */
export class FormEditorDefaultView implements vscode.Disposable {
	private readonly _subscriptions: vscode.Disposable[] = [];

	private readonly _dismissed = new Set<string>();

	private readonly _reopening = new Set<string>();

	/**
	 * Create the service and start watching the tabs.
	 */
	constructor() {
		this._subscriptions.push(vscode.window.tabGroups.onDidChangeTabs(event => this._onDidChangeTabs(event)));
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
	 * Reopen the documents whose text editors opened.
	 * @param event The tabs that opened and closed.
	 */
	private _onDidChangeTabs(event: vscode.TabChangeEvent): void {
		for (const tab of event.opened) {
			if (tab.input instanceof vscode.TabInputText) {
				void this._onDidOpenTextTab(tab.input.uri);
			}
		}
	}

	/**
	 * Reopen a document in the form editor when a text editor opened for it against the
	 * configured default.
	 * @param uri The document the text editor opened for.
	 */
	private async _onDidOpenTextTab(uri: vscode.Uri): Promise<void> {
		const key = uri.toString();

		if (!this._isEnabled() || uri.scheme !== 'file' || this._dismissed.has(key) || this._reopening.has(key) || _isFormOpen(key)) {
			return;
		}

		this._reopening.add(key);

		try {
			const document = await vscode.workspace.openTextDocument(uri);

			if (FORM_EDITOR_LANGUAGE_IDS.has(document.languageId)) {
				await switchEditorView(uri, FormEditorProvider.viewType);
			}
		} finally {
			this._reopening.delete(key);
		}
	}

	/**
	 * Indicate whether the form editor is configured as the default view.
	 * @returns `true` when it is.
	 */
	private _isEnabled(): boolean {
		return getConfig().get<string>('formEditor.defaultView') === 'form';
	}
}

/**
 * Indicate whether a document is open in a form editor.
 * @param key The string form of the document URI.
 * @returns `true` when a form editor tab shows the document.
 */
function _isFormOpen(key: string): boolean {
	return vscode.window.tabGroups.all.some(group => group.tabs.some(tab =>
		tab.input instanceof vscode.TabInputCustom && tab.input.viewType === FormEditorProvider.viewType && tab.input.uri.toString() === key
	));
}
