import * as vscode from 'vscode';
import { describe, it, expect } from 'vitest';
import { WorkspaceUri } from './workspace-uri';


describe('WorkspaceUri', () => {
	it('converts file: -> workspace: for a path inside the workspace', () => {
		const file = vscode.Uri.parse('file:///w/dir/file.ttl');
		const ws = WorkspaceUri.toWorkspaceUri(file)!;

		expect(ws).toBeTruthy();
		expect(ws.scheme).toBe('workspace');

		// Expect relative path preserved (ignore how toString formats slashes)
		expect(ws.path).toBe('/dir/file.ttl');
	});

	it('round-trips workspace: -> file:', () => {
		const ws = vscode.Uri.parse('workspace:/dir/file.ttl');
		const file = WorkspaceUri.toFileUri(ws);

		expect(file.scheme).toBe('file');
		expect(file.toString()).toBe('file:///w/dir/file.ttl');
	});

	it('preserves hash fragments when converting file: -> workspace: (e.g., notebooks)', () => {
		const file = vscode.Uri.parse('file:///w/notebook.mnb#cell1');
		const ws = WorkspaceUri.toWorkspaceUri(file)!;

		// Must preserve fragment
		expect(ws.scheme).toBe('workspace');
		expect(ws.fragment).toBe('cell1');
		expect(ws.path).toBe('/notebook.mnb');
	});

	it('preserves hash fragments when converting workspace: -> file:', () => {
		const workspaceUri = vscode.Uri.parse('workspace:/notebook.mnb#cell42');
		const fileUri = WorkspaceUri.toFileUri(workspaceUri);

		// Must preserve fragment in file URI as well
		expect(fileUri.scheme).toBe('file');
		expect(fileUri.fragment).toBe('cell42');
		expect(fileUri.path).toBe('/w/notebook.mnb');
	});

	it('supports converting workspace: -> vscode-notebook-cell:', () => {
		const workspaceUri = vscode.Uri.parse('workspace:/notebook.mnb#cell23');
		const notebookCellUri = WorkspaceUri.toNotebookCellUri(workspaceUri);

		expect(notebookCellUri.scheme).toBe('vscode-notebook-cell');
		expect(notebookCellUri.fragment).toBe('cell23');

		// The path should match the file path under the workspace root
		const expectedFile = vscode.Uri.parse('file:///w/notebook.mnb');
		expect(notebookCellUri.path).toBe(expectedFile.path);
	});

	it('returns undefined for unsupported input schemes when converting to workspace: (http/https)', () => {
		const httpUri = vscode.Uri.parse('http://example.com/a.ttl');
		const httpsUri = vscode.Uri.parse('https://example.com/a.ttl');

		expect(WorkspaceUri.toWorkspaceUri(httpUri)).toBeUndefined();
		expect(WorkspaceUri.toWorkspaceUri(httpsUri)).toBeUndefined();
	});

	it('throws for non-workspace input passed to toFileUri (unsupported scheme)', () => {
		const httpUri = vscode.Uri.parse('https://example.com/a.ttl');

		expect(() => WorkspaceUri.toFileUri(httpUri as any)).toThrow();
	});

	it('converts Windows-style file URIs (file:///C:/w/dir/file.ttl) to workspace: relative paths', () => {
		const workspaceFolders = vscode.workspace.workspaceFolders;

		(vscode.workspace as any).workspaceFolders = [
			{ name: "win-root", index: 0, uri: vscode.Uri.parse("file:///C:/w") },
		];

		const fileUri = vscode.Uri.parse('file:///C:/w/dir/file.ttl');
		const workspaceUri = WorkspaceUri.toWorkspaceUri(fileUri);

		expect(workspaceUri?.scheme).toBe('workspace');
		expect(workspaceUri?.path).toBe('/dir/file.ttl');

		// Restore the original workspace folders.
		(vscode.workspace as any).workspaceFolders = workspaceFolders;
	});
});
