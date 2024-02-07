import * as vscode from 'vscode';
import { getSortedWorkspaceFolders, getOuterMostWorkspaceFolder } from './workspace';

describe('Workspace Utilities', () => {
    test('can list all workspace folders', () => {
        const workspaces = getSortedWorkspaceFolders();

        expect(Array.isArray(workspaces)).toBe(true);
		expect(workspaces.length).toBeGreaterThan(0);
    });

    test('can retrieve the outermost workspace folder', () => {
		const workspace = vscode.workspace.workspaceFolders![0];
        const rootWorkspace = getOuterMostWorkspaceFolder(workspace);

        expect(typeof rootWorkspace).toBe('object');
        expect(rootWorkspace).toHaveProperty('name');
        expect(rootWorkspace).toHaveProperty('path');
    });

	test('can find all parsable documents of a given type', () => {
    });
});