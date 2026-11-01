import * as vscode from 'vscode';
import { EditOperation } from '@src/services/editing/edit-operation';
import { getIriResourceId } from '@src/services/editing/resource-id';
import { IDefinitionRevealTarget } from '@src/views/trees/definition-tree/definition-reveal-target.interface';
import { FormEditorSession } from './form-editor-session';

/**
 * Provides the form based editor for RDF documents. The editor is a custom *text* editor: it
 * works on the ordinary text document, so saving, dirty state, hot exit and undo are handled by
 * VS Code, and every change stays a plain text edit.
 */
export class FormEditorProvider implements vscode.CustomTextEditorProvider, IDefinitionRevealTarget, vscode.Disposable {
	/**
	 * The view type contributed in the manifest.
	 */
	static readonly viewType = 'mentor.formEditor';

	private readonly _sessions = new Map<string, Set<FormEditorSession>>();

	/**
	 * Create the provider and register it with VS Code.
	 * @param _context The extension context.
	 */
	constructor(private readonly _context: vscode.ExtensionContext) {
		_context.subscriptions.push(
			vscode.window.registerCustomEditorProvider(FormEditorProvider.viewType, this, {
				// Keeps the scroll position and expanded resources alive while the tab is hidden.
				webviewOptions: { retainContextWhenHidden: true, enableFindWidget: false },
				supportsMultipleEditorsPerDocument: true
			}),
			this
		);

		if (typeof process !== 'undefined' && process.env.MENTOR_E2E === '1') {
			this._registerTestHooks();
		}
	}

	/**
	 * Serve a tab VS Code opened the editor in.
	 * @param document The document shown in the tab.
	 * @param webviewPanel The panel of the tab.
	 * @param token Cancelled when the tab was closed before the editor resolved.
	 */
	async resolveCustomTextEditor(document: vscode.TextDocument, webviewPanel: vscode.WebviewPanel, token: vscode.CancellationToken): Promise<void> {
		if (token.isCancellationRequested) {
			return;
		}

		const key = document.uri.toString();
		const session = new FormEditorSession(this._context, document, webviewPanel);
		const sessions = this._sessions.get(key) ?? new Set<FormEditorSession>();

		sessions.add(session);
		this._sessions.set(key, sessions);

		webviewPanel.onDidDispose(() => {
			session.dispose();
			sessions.delete(session);

			if (sessions.size === 0) {
				this._sessions.delete(key);
			}
		});

		await session.initialize();
	}

	revealDefinition(documentUri: vscode.Uri, resource: string): boolean {
		if (!this.isActive(documentUri)) {
			return false;
		}

		// A blank node of the tree has an identifier of the store, which names no resource of the form.
		const resourceId = getIriResourceId(resource);
		const sessions = this._sessionsOf(documentUri).filter(session => session.describes(resourceId));

		for (const session of sessions) {
			session.revealResource(resourceId);
		}

		return sessions.length > 0;
	}

	filterDefinitions(documentUri: vscode.Uri, label: string, resources: readonly string[]): boolean {
		if (!this.isActive(documentUri)) {
			return false;
		}

		const resourceIds = resources.map(getIriResourceId);

		for (const session of this._sessionsOf(documentUri)) {
			session.filterResources(label, resourceIds);
		}

		return true;
	}

	/**
	 * Indicate whether the editor in front is a form editor showing a document, as it is while
	 * the definition tree has the focus after the editor had it.
	 * @param uri The document to check.
	 * @returns `true` when the active tab is a form editor of the document.
	 */
	isActive(uri: vscode.Uri): boolean {
		const input = vscode.window.tabGroups.activeTabGroup.activeTab?.input;

		return input instanceof vscode.TabInputCustom
			&& input.viewType === FormEditorProvider.viewType
			&& input.uri.toString() === uri.toString();
	}

	/**
	 * Indicate whether a document is currently open in a form editor.
	 * @param uri The document to check.
	 * @returns `true` if at least one form editor shows the document.
	 */
	isOpen(uri: vscode.Uri): boolean {
		return this._sessionsOf(uri).length > 0;
	}

	dispose(): void {
		for (const sessions of this._sessions.values()) {
			for (const session of sessions) {
				session.dispose();
			}
		}

		this._sessions.clear();
	}

	/**
	 * The sessions showing a document.
	 * @param uri The document.
	 * @returns The sessions.
	 */
	private _sessionsOf(uri: vscode.Uri): FormEditorSession[] {
		return Array.from(this._sessions.get(uri.toString()) ?? []);
	}

	/**
	 * Register the test-only hooks of the end-to-end suite, which reach what the VS Code API
	 * cannot: the snapshot a form editor shows and the edits its form would send.
	 */
	private _registerTestHooks(): void {
		this._context.subscriptions.push(
			vscode.commands.registerCommand('mentor.e2e.getFormEditorSnapshot', (documentUri: string) => {
				return this._sessionsOf(vscode.Uri.parse(documentUri))[0]?.snapshot;
			}),
			vscode.commands.registerCommand('mentor.e2e.applyFormEditorEdit', async (documentUri: string, operations: EditOperation[]) => {
				const session = this._sessionsOf(vscode.Uri.parse(documentUri))[0];
				const version = session?.snapshot?.version;

				if (!session || version === undefined) {
					throw new Error(`No form editor shows ${documentUri}.`);
				}

				return session.applyEdit(`e2e-${Date.now()}`, version, operations);
			})
		);
	}
}
