import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { switchEditorView } from '@src/utilities/vscode/editor-view';

const FORM_EDITOR = 'mentor.formEditor';

/**
 * A tab showing a resource in the text editor.
 */
function textTab(uri: vscode.Uri) {
	return { input: new vscode.TabInputText(uri) };
}

/**
 * A tab showing a resource in a custom editor.
 */
function customTab(uri: vscode.Uri, viewType: string) {
	return { input: new vscode.TabInputCustom(uri, viewType) };
}

describe('switchEditorView', () => {
	const uri = vscode.Uri.parse('file:///doc.ttl');
	const other = vscode.Uri.parse('file:///other.ttl');
	const tabGroups = vscode.window.tabGroups as unknown as { all: unknown[]; close: ReturnType<typeof vi.fn> };
	const workspace = vscode.workspace as unknown as { textDocuments: unknown[] };
	const executeCommand = vi.spyOn(vscode.commands, 'executeCommand');

	beforeEach(() => {
		executeCommand.mockClear();
		tabGroups.close = vi.fn(async () => true);
		tabGroups.all = [];
		workspace.textDocuments = [];
	});

	it('opens the resource with the requested editor', async () => {
		await switchEditorView(uri, FORM_EDITOR);

		expect(executeCommand).toHaveBeenCalledWith('vscode.openWith', uri, FORM_EDITOR);
	});

	it('closes the tabs that show the resource in another editor', async () => {
		const stale = textTab(uri);

		tabGroups.all = [{ tabs: [stale, customTab(uri, FORM_EDITOR), textTab(other)] }];

		await switchEditorView(uri, FORM_EDITOR);

		expect(tabGroups.close).toHaveBeenCalledWith([stale], true);
	});

	it('treats the text editor as the default view', async () => {
		const stale = customTab(uri, FORM_EDITOR);

		tabGroups.all = [{ tabs: [textTab(uri), stale] }];

		await switchEditorView(uri, 'default');

		expect(tabGroups.close).toHaveBeenCalledWith([stale], true);
	});

	it('closes nothing when no other editor shows the resource', async () => {
		tabGroups.all = [{ tabs: [customTab(uri, FORM_EDITOR), textTab(other)] }];

		await switchEditorView(uri, FORM_EDITOR);

		expect(tabGroups.close).not.toHaveBeenCalled();
	});

	it('leaves the tabs alone when the document has unsaved changes', async () => {
		tabGroups.all = [{ tabs: [textTab(uri)] }];
		workspace.textDocuments = [{ uri, isDirty: true }];

		await switchEditorView(uri, FORM_EDITOR);

		expect(executeCommand).toHaveBeenCalledWith('vscode.openWith', uri, FORM_EDITOR);
		expect(tabGroups.close).not.toHaveBeenCalled();
	});
});
