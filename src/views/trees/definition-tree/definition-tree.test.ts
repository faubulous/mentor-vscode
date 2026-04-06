import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({ serialize: vi.fn() }));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

const { mockDefinitionNodeProvider } = vi.hoisted(() => ({
	mockDefinitionNodeProvider: {
		refresh: vi.fn(),
		getNodeForUri: vi.fn(() => undefined),
	},
}));

vi.mock('./definition-node-provider', () => ({
	DefinitionNodeProvider: class {
		refresh = mockDefinitionNodeProvider.refresh;
		getNodeForUri = mockDefinitionNodeProvider.getNodeForUri;
	},
}));

vi.mock('./definition-node-decoration-provider', () => ({
	DefinitionNodeDecorationProvider: class {},
}));

const mockContextChangeHandlers: Array<() => void> = [];
const mockContextService = {
	activeContext: undefined as any,
	contexts: {} as Record<string, any>,
	onDidChangeDocumentContext: vi.fn((handler: () => void) => {
		mockContextChangeHandlers.push(handler);
		return { dispose: () => {} };
	}),
};

const mockSettingsChangeHandlers = new Map<string, Array<() => void>>();
const mockSettings = {
	get: vi.fn((key: string, defaultValue?: any) => defaultValue),
	set: vi.fn(),
	onDidChange: vi.fn((key: string, handler: () => void) => {
		if (!mockSettingsChangeHandlers.has(key)) {
			mockSettingsChangeHandlers.set(key, []);
		}
		mockSettingsChangeHandlers.get(key)!.push(handler);
		return { dispose: () => {} };
	}),
};

const mockSubscriptions: any[] = [];
const mockExtensionContext = { subscriptions: mockSubscriptions };

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'DocumentContextService') return mockContextService;
			if (token === 'SettingsService') return mockSettings;
			if (token === 'ExtensionContext') return mockExtensionContext;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { DefinitionTree } from './definition-tree';

describe('DefinitionTree', () => {
	let tree: DefinitionTree;
	let mockRegisterCommand: any;
	let mockRegisterFileDecoration: any;
	let mockExecuteCommand: any;
	let mockOnDidChangeTextEditorSelection: any;
	let selectionHandlers: Array<(e: any) => void>;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSubscriptions.length = 0;
		mockContextChangeHandlers.length = 0;
		mockSettingsChangeHandlers.clear();
		selectionHandlers = [];

		mockRegisterCommand = vi.fn((_id: string, _handler: any) => ({ dispose: () => {} }));
		mockRegisterFileDecoration = vi.fn(() => ({ dispose: () => {} }));
		mockExecuteCommand = vi.fn(async () => undefined);
		mockOnDidChangeTextEditorSelection = vi.fn((handler: any) => {
			selectionHandlers.push(handler);
			return { dispose: () => {} };
		});

		(vscode.commands as any).registerCommand = mockRegisterCommand;
		(vscode.window as any).registerFileDecorationProvider = mockRegisterFileDecoration;
		(vscode.commands as any).executeCommand = mockExecuteCommand;
		(vscode.window as any).onDidChangeTextEditorSelection = mockOnDidChangeTextEditorSelection;

		mockContextService.activeContext = undefined;
		mockContextService.contexts = {};

		tree = new DefinitionTree();
	});

	it('has correct id', () => {
		expect(tree.id).toBe('mentor.view.definitionTree');
	});

	it('creates tree view', () => {
		expect(tree.treeView).toBeDefined();
	});

	it('registers refresh command', () => {
		expect(mockRegisterCommand).toHaveBeenCalledWith('mentor.command.refreshDefinitionsTree', expect.any(Function));
	});

	it('registers file decoration provider', () => {
		expect(mockRegisterFileDecoration).toHaveBeenCalled();
	});

	it('pushes disposables to extension context subscriptions', () => {
		expect(mockSubscriptions.length).toBeGreaterThan(0);
	});

	it('sets tree view message when no active context', () => {
		mockContextService.activeContext = undefined;
		// Trigger _onDidChangeDocumentContext via the registered handler
		for (const h of mockContextChangeHandlers) {
			h();
		}
		expect(tree.treeView.message).toBe('No file selected.');
	});

	it('clears tree view message when active context exists', () => {
		mockContextService.activeContext = { activeLanguageTag: 'en' };
		for (const h of mockContextChangeHandlers) {
			h();
		}
		expect(tree.treeView.message).toBeUndefined();
	});

	it('refresh command refreshes tree data provider', async () => {
		const [, handler] = mockRegisterCommand.mock.calls.find((c: any[]) => c[0] === 'mentor.command.refreshDefinitionsTree');
		await handler();
		expect(mockDefinitionNodeProvider.refresh).toHaveBeenCalled();
	});

	it('updates view title when active language changes', () => {
		mockContextService.activeContext = { activeLanguageTag: 'en' };
		(tree.treeView as any).title = 'Definition Tree';
		const handlers = mockSettingsChangeHandlers.get('view.activeLanguage') ?? [];
		for (const h of handlers) {
			h();
		}
		expect(tree.treeView.title).toContain('en');
	});

	it('does not reveal when no matching context for selection', async () => {
		mockContextService.contexts = {}; // no context for the document
		const mockEvent = {
			textEditor: { document: { uri: vscode.Uri.parse('file:///test.ttl') } },
			selections: [{ active: new vscode.Position(5, 10) }],
		};
		for (const h of selectionHandlers) {
			h(mockEvent);
		}
		// Wait for debounce timer
		await new Promise(r => setTimeout(r, 400));
		// No reveal called since no context
		expect(mockDefinitionNodeProvider.getNodeForUri).not.toHaveBeenCalled();
	});
});
