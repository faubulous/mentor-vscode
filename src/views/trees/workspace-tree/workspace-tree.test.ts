import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({ serialize: vi.fn() }));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

const { mockWorkspaceNodeProvider } = vi.hoisted(() => ({
	mockWorkspaceNodeProvider: {
		refresh: vi.fn(),
	},
}));

vi.mock('./workspace-node-provider', () => ({
	WorkspaceNodeProvider: class {
		refresh = mockWorkspaceNodeProvider.refresh;
	},
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ExtensionContext') return { subscriptions: mockSubscriptions };
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { WorkspaceTree } from './workspace-tree';

const mockSubscriptions: any[] = [];

describe('WorkspaceTree', () => {
	let tree: WorkspaceTree;
	let mockRegisterCommand: any;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSubscriptions.length = 0;
		mockRegisterCommand = vi.fn((_id: string, handler: () => void) => ({ dispose: () => {} }));
		(vscode.commands as any).registerCommand = mockRegisterCommand;
		(vscode.workspace as any).name = 'TestWorkspace';
		tree = new WorkspaceTree();
	});

	it('has correct id', () => {
		expect(tree.id).toBe('mentor.view.workspaceTree');
	});

	it('creates tree view', () => {
		expect(tree.treeView).toBeDefined();
	});

	it('registers refresh command', () => {
		expect(mockRegisterCommand).toHaveBeenCalledWith('mentor.command.refreshWorkspaceTree', expect.any(Function));
	});

	it('refresh command calls treeDataProvider.refresh', async () => {
		const [, handler] = mockRegisterCommand.mock.calls.find((c: any[]) => c[0] === 'mentor.command.refreshWorkspaceTree');
		await handler();
		expect(mockWorkspaceNodeProvider.refresh).toHaveBeenCalled();
	});

	it('pushes disposables to extension context subscriptions', () => {
		expect(mockSubscriptions.length).toBeGreaterThan(0);
	});
});
