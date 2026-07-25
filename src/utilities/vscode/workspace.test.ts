import { describe, expect, test, beforeEach, afterEach } from 'vitest';
import * as vscode from 'vscode';
import { getWorkspaceId, getWorkspaceName, ensureWorkspaceId } from './workspace';

let workspaceIdValue: string | undefined;
let updates: { key: string; value: unknown; target: number }[];

beforeEach(() => {
	workspaceIdValue = undefined;
	updates = [];

	(vscode.workspace as any).workspaceFile = undefined;
	(vscode.workspace as any).workspaceFolders = undefined;

	(vscode.workspace as any).getConfiguration = () => ({
		inspect: (key: string) => (key === 'workspaceId' ? { workspaceValue: workspaceIdValue } : undefined),
		update: async (key: string, value: any, target: number) => {
			updates.push({ key, value, target });
			if (key === 'workspaceId') {
				workspaceIdValue = value;
			}
		},
	});
});

afterEach(() => {
	(vscode.workspace as any).workspaceFile = undefined;
	(vscode.workspace as any).workspaceFolders = undefined;
});

describe('getWorkspaceName', () => {
	test('returns the .code-workspace basename without extension', () => {
		(vscode.workspace as any).workspaceFile = vscode.Uri.parse('file:///repo/mentor.code-workspace');

		expect(getWorkspaceName()).toBe('mentor');
	});

	test('falls back to the first folder name for a single-folder workspace', () => {
		(vscode.workspace as any).workspaceFolders = [{ name: 'my-folder' }];

		expect(getWorkspaceName()).toBe('my-folder');
	});

	test('ignores an untitled (unsaved) workspace file and falls back to the folder', () => {
		(vscode.workspace as any).workspaceFile = vscode.Uri.parse('untitled:Workspace');
		(vscode.workspace as any).workspaceFolders = [{ name: 'my-folder' }];

		expect(getWorkspaceName()).toBe('my-folder');
	});

	test('returns undefined when no workspace is open', () => {
		expect(getWorkspaceName()).toBeUndefined();
	});
});

describe('getWorkspaceId / ensureWorkspaceId', () => {
	test('getWorkspaceId reads the persisted workspace-scope value', () => {
		workspaceIdValue = 'abc-123';

		expect(getWorkspaceId()).toBe('abc-123');
	});

	test('ensureWorkspaceId returns the existing id without writing', async () => {
		workspaceIdValue = 'abc-123';
		(vscode.workspace as any).workspaceFolders = [{ name: 'my-folder' }];

		expect(await ensureWorkspaceId()).toBe('abc-123');
		expect(updates).toHaveLength(0);
	});

	test('ensureWorkspaceId generates and persists a UUID at workspace scope', async () => {
		(vscode.workspace as any).workspaceFolders = [{ name: 'my-folder' }];

		const id = await ensureWorkspaceId();

		expect(id).toMatch(/^[0-9a-f-]{36}$/);
		expect(updates).toEqual([{ key: 'workspaceId', value: id, target: vscode.ConfigurationTarget.Workspace }]);
		expect(getWorkspaceId()).toBe(id);
	});

	test('ensureWorkspaceId is undefined and writes nothing when no workspace or folder is open', async () => {
		expect(await ensureWorkspaceId()).toBeUndefined();
		expect(updates).toHaveLength(0);
	});
});
