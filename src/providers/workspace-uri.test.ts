import * as vscode from 'vscode';
import { describe, it, expect, afterEach } from 'vitest';
import { WorkspaceUri } from './workspace-uri';


describe('WorkspaceUri', () => {
	afterEach(() => {
		// Reset the monorepo root after each test.
		WorkspaceUri.rootUri = undefined;
	});

	it('converts file: -> workspace: for a path inside the workspace', () => {
		const fileUri = vscode.Uri.parse('file:///w/dir/file.ttl');
		const workspaceUri = WorkspaceUri.toWorkspaceUri(fileUri)!;

		expect(workspaceUri).toBeTruthy();
		expect(workspaceUri.scheme).toBe('workspace');
		expect(workspaceUri.path).toBe('/dir/file.ttl');
		expect(WorkspaceUri.toCanonicalString(workspaceUri)).toBe('workspace:///dir/file.ttl');
	});

	it('converts vscode-notebook-cell: -> workspace: and preserves fragments', () => {
		// Simulate a notebook cell URI inside the workspace root
		const cellUri = vscode.Uri.parse('vscode-notebook-cell:/w/notebook.mnb#cell7');
		const workspaceUri = WorkspaceUri.toWorkspaceUri(cellUri)!;

		expect(workspaceUri.scheme).toBe('workspace');
		expect(workspaceUri.fragment).toBe('cell7');
		expect(workspaceUri.path).toBe('/notebook.mnb');
	});

	it('round-trips workspace: -> file:', () => {
		const workspaceUri = vscode.Uri.parse('workspace:/dir/file.ttl');
		const fileUri = WorkspaceUri.toFileUri(workspaceUri);

		expect(fileUri.scheme).toBe('file');
		expect(fileUri.toString()).toBe('file:///w/dir/file.ttl');
	});

	it('preserves hash fragments when converting file: -> workspace: (e.g., notebooks)', () => {
		const fileUri = vscode.Uri.parse('file:///w/notebook.mnb#cell1');
		const workspaceUri = WorkspaceUri.toWorkspaceUri(fileUri)!;

		// Must preserve fragment
		expect(workspaceUri.scheme).toBe('workspace');
		expect(workspaceUri.fragment).toBe('cell1');
		expect(workspaceUri.path).toBe('/notebook.mnb');
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

	it('returns the URI unchanged when input is already a workspace: URI', () => {
		const wsUri = vscode.Uri.parse('workspace:/some/file.ttl');
		const result = WorkspaceUri.toWorkspaceUri(wsUri);

		expect(result).toBe(wsUri);
		expect(result?.scheme).toBe('workspace');
	});

	it('returns undefined when no workspace folders are open (toWorkspaceUri)', () => {
		const saved = vscode.workspace.workspaceFolders;
		(vscode.workspace as any).workspaceFolders = [];

		const fileUri = vscode.Uri.parse('file:///anywhere/file.ttl');
		const result = WorkspaceUri.toWorkspaceUri(fileUri);

		expect(result).toBeUndefined();

		(vscode.workspace as any).workspaceFolders = saved;
	});

	it('throws when no workspace folders are open (toFileUri)', () => {
		const saved = vscode.workspace.workspaceFolders;
		(vscode.workspace as any).workspaceFolders = [];

		const wsUri = vscode.Uri.parse('workspace:/some/file.ttl');

		expect(() => WorkspaceUri.toFileUri(wsUri)).toThrow('No workspace folders are open.');

		(vscode.workspace as any).workspaceFolders = saved;
	});

	it('throws when a non-workspace URI is passed to toNotebookCellUri', () => {
		const fileUri = vscode.Uri.parse('file:///w/notebook.mnb');

		expect(() => WorkspaceUri.toNotebookCellUri(fileUri)).toThrow('Cannot convert non-workspace URI to notebook cell URI');
	});

	it('throws when a workspace URI with no fragment is passed to toNotebookCellUri', () => {
		const wsUri = vscode.Uri.parse('workspace:/notebook.mnb');  // no fragment

		expect(() => WorkspaceUri.toNotebookCellUri(wsUri)).toThrow('Workspace URI does not have a fragment for the notebook cell');
	});

	it('handles workspace: URI whose path does not start with / in toFileUri (line 81 else branch)', () => {
		// URI.parse with no authority gives a path without a leading slash
		const wsUri = vscode.Uri.parse('workspace:some/path.ttl');

		// Path should not start with '/'
		expect(wsUri.path.startsWith('/')).toBe(false);

		const fileUri = WorkspaceUri.toFileUri(wsUri);

		expect(fileUri.scheme).toBe('file');
		expect(fileUri.toString()).toBe('file:///w/some/path.ttl');
	});

	describe('with monorepo root', () => {
		it('uses the monorepo root for toWorkspaceUri when rootUri is set', () => {
			// Monorepo root is the parent of the workspace folder.
			WorkspaceUri.rootUri = vscode.Uri.parse('file:///monorepo');

			const fileUri = vscode.Uri.parse('file:///monorepo/shared/core.ttl');
			const workspaceUri = WorkspaceUri.toWorkspaceUri(fileUri)!;

			expect(workspaceUri.scheme).toBe('workspace');
			expect(workspaceUri.path).toBe('/shared/core.ttl');
			expect(WorkspaceUri.toCanonicalString(workspaceUri)).toBe('workspace:///shared/core.ttl');
		});

		it('uses the monorepo root for toFileUri when rootUri is set', () => {
			WorkspaceUri.rootUri = vscode.Uri.parse('file:///monorepo');

			const wsUri = vscode.Uri.parse('workspace:///shared/core.ttl');
			const fileUri = WorkspaceUri.toFileUri(wsUri);

			expect(fileUri.scheme).toBe('file');
			expect(fileUri.path).toBe('/monorepo/shared/core.ttl');
		});

		it('produces identical workspace URIs regardless of which workspace folder is active', () => {
			// Both workspaces share the same monorepo root.
			WorkspaceUri.rootUri = vscode.Uri.parse('file:///monorepo');

			const fileUri = vscode.Uri.parse('file:///monorepo/shared/core.ttl');
			const wsUri = WorkspaceUri.toWorkspaceUri(fileUri);

			expect(wsUri).toBeTruthy();
			expect(wsUri!.path).toBe('/shared/core.ttl');
		});

		it('round-trips through monorepo root correctly', () => {
			WorkspaceUri.rootUri = vscode.Uri.parse('file:///monorepo');

			const original = vscode.Uri.parse('file:///monorepo/ontologies/pizza.ttl');
			const wsUri = WorkspaceUri.toWorkspaceUri(original)!;
			const restored = WorkspaceUri.toFileUri(wsUri);

			expect(restored.toString()).toBe(original.toString());
		});

		it('falls back to workspace folders when file is outside the monorepo root', () => {
			WorkspaceUri.rootUri = vscode.Uri.parse('file:///monorepo');

			// File is inside the workspace folder (/w) but outside the monorepo root.
			const fileUri = vscode.Uri.parse('file:///w/external/file.ttl');
			const wsUri = WorkspaceUri.toWorkspaceUri(fileUri);

			// Should fall back to workspace folder root (/w).
			expect(wsUri).toBeTruthy();
			expect(wsUri!.scheme).toBe('workspace');
			expect(wsUri!.path).toBe('/external/file.ttl');
		});

		it('returns undefined when file is outside both monorepo root and workspace folders', () => {
			WorkspaceUri.rootUri = vscode.Uri.parse('file:///monorepo');

			const fileUri = vscode.Uri.parse('file:///completely/elsewhere/file.ttl');
			const wsUri = WorkspaceUri.toWorkspaceUri(fileUri);

			expect(wsUri).toBeUndefined();
		});

		it('preserves fragments when using monorepo root', () => {
			WorkspaceUri.rootUri = vscode.Uri.parse('file:///monorepo');

			const fileUri = vscode.Uri.parse('file:///monorepo/notebook.mnb#cell5');
			const wsUri = WorkspaceUri.toWorkspaceUri(fileUri)!;

			expect(wsUri.scheme).toBe('workspace');
			expect(wsUri.path).toBe('/notebook.mnb');
			expect(wsUri.fragment).toBe('cell5');
		});

		it('falls back to first workspace folder when rootUri is not set', () => {
			// rootUri is undefined (default).
			const fileUri = vscode.Uri.parse('file:///w/dir/file.ttl');
			const wsUri = WorkspaceUri.toWorkspaceUri(fileUri)!;

			// Should use /w (the mock workspace folder root).
			expect(wsUri.path).toBe('/dir/file.ttl');
		});
	});

	describe('with .code-workspace file (multi-folder workspace)', () => {
		const savedWorkspaceFile = (vscode.workspace as any).workspaceFile;
		const savedFolders = (vscode.workspace as any).workspaceFolders;

		afterEach(() => {
			(vscode.workspace as any).workspaceFile = savedWorkspaceFile;
			(vscode.workspace as any).workspaceFolders = savedFolders;
		});

		it('includes the folder name in workspace URIs when a workspace file is open', () => {
			// Workspace file at the project root; folders are subdirectories.
			(vscode.workspace as any).workspaceFile = vscode.Uri.parse('file:///project/workspace.code-workspace');
			(vscode.workspace as any).workspaceFolders = [
				{ name: 'examples', index: 0, uri: vscode.Uri.parse('file:///project/examples') },
				{ name: 'onto2', index: 1, uri: vscode.Uri.parse('file:///project/onto2/example2') },
			];

			const fileUri = vscode.Uri.parse('file:///project/examples/mytaxonomy.ttl');
			const wsUri = WorkspaceUri.toWorkspaceUri(fileUri)!;

			expect(wsUri.scheme).toBe('workspace');
			// Folder name must be preserved.
			expect(wsUri.path).toBe('/examples/mytaxonomy.ttl');
			expect(WorkspaceUri.toCanonicalString(wsUri)).toBe('workspace:///examples/mytaxonomy.ttl');
		});

		it('resolves files in a second workspace folder correctly', () => {
			(vscode.workspace as any).workspaceFile = vscode.Uri.parse('file:///project/workspace.code-workspace');
			(vscode.workspace as any).workspaceFolders = [
				{ name: 'examples', index: 0, uri: vscode.Uri.parse('file:///project/examples') },
				{ name: 'onto2', index: 1, uri: vscode.Uri.parse('file:///project/onto2/example2') },
			];

			const fileUri = vscode.Uri.parse('file:///project/onto2/example2/electrochemistry.ttl');
			const wsUri = WorkspaceUri.toWorkspaceUri(fileUri)!;

			expect(wsUri.scheme).toBe('workspace');
			expect(wsUri.path).toBe('/onto2/example2/electrochemistry.ttl');
			expect(WorkspaceUri.toCanonicalString(wsUri)).toBe('workspace:///onto2/example2/electrochemistry.ttl');
		});

		it('round-trips workspace file URIs correctly', () => {
			(vscode.workspace as any).workspaceFile = vscode.Uri.parse('file:///project/workspace.code-workspace');
			(vscode.workspace as any).workspaceFolders = [
				{ name: 'examples', index: 0, uri: vscode.Uri.parse('file:///project/examples') },
			];

			const original = vscode.Uri.parse('file:///project/examples/pizza.ttl');
			const wsUri = WorkspaceUri.toWorkspaceUri(original)!;
			const restored = WorkspaceUri.toFileUri(wsUri);

			expect(restored.path).toBe('/project/examples/pizza.ttl');
		});
	});

	describe('toCanonicalString', () => {
		it('produces triple-slash format for workspace URIs', () => {
			const wsUri = vscode.Uri.parse('workspace:///dir/file.ttl');
			expect(WorkspaceUri.toCanonicalString(wsUri)).toBe('workspace:///dir/file.ttl');
		});

		it('preserves query parameters', () => {
			const wsUri = vscode.Uri.parse('workspace:///dir/file.ttl?inference');
			expect(WorkspaceUri.toCanonicalString(wsUri)).toBe('workspace:///dir/file.ttl?inference');
		});

		it('preserves fragments', () => {
			const wsUri = vscode.Uri.parse('workspace:///notebook.mnb#cell5');
			expect(WorkspaceUri.toCanonicalString(wsUri)).toBe('workspace:///notebook.mnb#cell5');
		});

		it('delegates to toString(true) for non-workspace URIs', () => {
			const httpUri = vscode.Uri.parse('http://example.org/ontology');
			expect(WorkspaceUri.toCanonicalString(httpUri)).toBe('http://example.org/ontology');
		});

		it('returns string inputs unchanged', () => {
			expect(WorkspaceUri.toCanonicalString('workspace:///dir/file.ttl')).toBe('workspace:///dir/file.ttl');
			expect(WorkspaceUri.toCanonicalString('http://example.org')).toBe('http://example.org');
		});

		it('round-trips file -> workspace -> canonical string correctly', () => {
			const fileUri = vscode.Uri.parse('file:///w/ontologies/pizza.ttl');
			const wsUri = WorkspaceUri.toWorkspaceUri(fileUri)!;
			expect(WorkspaceUri.toCanonicalString(wsUri)).toBe('workspace:///ontologies/pizza.ttl');
		});

		it('round-trips with monorepo root correctly', () => {
			WorkspaceUri.rootUri = vscode.Uri.parse('file:///monorepo');

			const fileUri = vscode.Uri.parse('file:///monorepo/shared/core.ttl');
			const wsUri = WorkspaceUri.toWorkspaceUri(fileUri)!;
			expect(WorkspaceUri.toCanonicalString(wsUri)).toBe('workspace:///shared/core.ttl');
		});
	});
});
