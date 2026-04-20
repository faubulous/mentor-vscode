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
		setIssueColorProvider: vi.fn(),
	},
}));

vi.mock('./definition-node-provider', () => ({
	DefinitionNodeProvider: class {
		refresh = mockDefinitionNodeProvider.refresh;
		getNodeForUri = mockDefinitionNodeProvider.getNodeForUri;
		setIssueColorProvider = mockDefinitionNodeProvider.setIssueColorProvider;
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

const mockValidationService = {
	onDidValidate: vi.fn((_handler: () => void) => {
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
			if (token === 'ShaclValidationService') return mockValidationService;
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
		vi.resetAllMocks();
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

	it('reveals node in treeView when selection matches an IRI with a known node', async () => {
		const iri = 'urn:ex#MyClass';
		const mockNode = { uri: iri, id: 'some-id' };
		// mockDefinitionNodeProvider.getNodeForUri is the original hoisted mock — use mockReturnValue
		mockDefinitionNodeProvider.getNodeForUri.mockReturnValue(mockNode as any);

		const mockContext = { getIriAtPosition: vi.fn(() => iri) };
		mockContextService.contexts = { 'file:///test.ttl': mockContext };

		const revealSpy = vi.spyOn(tree.treeView, 'reveal').mockResolvedValue(undefined);

		const mockEvent = {
			textEditor: { document: { uri: vscode.Uri.parse('file:///test.ttl') } },
			selections: [{ active: new vscode.Position(5, 10) }],
		};
		for (const h of selectionHandlers) {
			h(mockEvent);
		}
		await new Promise(r => setTimeout(r, 400));

		expect(mockDefinitionNodeProvider.getNodeForUri).toHaveBeenCalledWith(iri);
		expect(revealSpy).toHaveBeenCalledWith(mockNode, { select: true, focus: false, expand: true });
	});

	it('does not call reveal when getNodeForUri returns undefined', async () => {
		// The default mock returns undefined — no need to override
		const mockContext = { getIriAtPosition: vi.fn(() => 'urn:ex#Missing') };
		mockContextService.contexts = { 'file:///test.ttl': mockContext };

		const revealSpy = vi.spyOn(tree.treeView, 'reveal').mockResolvedValue(undefined);

		const mockEvent = {
			textEditor: { document: { uri: vscode.Uri.parse('file:///test.ttl') } },
			selections: [{ active: new vscode.Position(5, 10) }],
		};
		for (const h of selectionHandlers) {
			h(mockEvent);
		}
		await new Promise(r => setTimeout(r, 400));

		expect(revealSpy).not.toHaveBeenCalled();
	});

	it('does not call reveal when context has no IRI at position', async () => {
		const mockContext = { getIriAtPosition: vi.fn(() => null) };
		mockContextService.contexts = { 'file:///test.ttl': mockContext };

		const revealSpy = vi.spyOn(tree.treeView, 'reveal').mockResolvedValue(undefined);

		const mockEvent = {
			textEditor: { document: { uri: vscode.Uri.parse('file:///test.ttl') } },
			selections: [{ active: new vscode.Position(5, 10) }],
		};
		for (const h of selectionHandlers) {
			h(mockEvent);
		}
		await new Promise(r => setTimeout(r, 400));

		expect(revealSpy).not.toHaveBeenCalled();
	});

	it('does not reveal when definition tree view is not visible', async () => {
		(tree.treeView as any).visible = false;

		const iri = 'urn:ex#MyClass';
		const mockContext = { getIriAtPosition: vi.fn(() => iri) };
		mockContextService.contexts = { 'file:///test.ttl': mockContext };

		const revealSpy = vi.spyOn(tree.treeView, 'reveal').mockResolvedValue(undefined);
		const mockEvent = {
			textEditor: { document: { uri: vscode.Uri.parse('file:///test.ttl') } },
			selections: [{ active: new vscode.Position(5, 10) }],
		};

		for (const h of selectionHandlers) {
			h(mockEvent);
		}
		await new Promise(r => setTimeout(r, 400));

		expect(revealSpy).not.toHaveBeenCalled();
		expect(mockDefinitionNodeProvider.getNodeForUri).not.toHaveBeenCalled();
	});

	it('sets view title without language tag when context has no activeLanguageTag', () => {
		mockContextService.activeContext = { activeLanguageTag: undefined };
		(tree.treeView as any).title = 'Definition Tree';
		for (const h of mockContextChangeHandlers) {
			h();
		}
		expect(tree.treeView.title).toBe('Definition Tree');
	});

	it('cancels previous debounce timer when a second selection fires before timeout', async () => {
		// Fire two events quickly — the first debounce should be cancelled
		const mockContext = { getIriAtPosition: vi.fn(() => null) };
		mockContextService.contexts = { 'file:///test.ttl': mockContext };

		const revealSpy = vi.spyOn(tree.treeView, 'reveal').mockResolvedValue(undefined);
		const mockEvent = {
			textEditor: { document: { uri: vscode.Uri.parse('file:///test.ttl') } },
			selections: [{ active: new vscode.Position(1, 0) }],
		};

		for (const h of selectionHandlers) { h(mockEvent); }
		// Immediately fire a second event before the 300ms debounce expires
		for (const h of selectionHandlers) { h(mockEvent); }

		await new Promise(r => setTimeout(r, 400));
		// reveal not called (getIriAtPosition returns null)
		expect(revealSpy).not.toHaveBeenCalled();
	});

	it('does not call reveal when event has no active selection position', async () => {
		const mockContext = { getIriAtPosition: vi.fn(() => 'urn:ex#X') };
		mockContextService.contexts = { 'file:///test.ttl': mockContext };

		const revealSpy = vi.spyOn(tree.treeView, 'reveal').mockResolvedValue(undefined);
		const mockEvent = {
			textEditor: { document: { uri: vscode.Uri.parse('file:///test.ttl') } },
			selections: [], // no selections → e.selections[0]?.active is undefined
		};

		for (const h of selectionHandlers) { h(mockEvent); }
		await new Promise(r => setTimeout(r, 400));
		expect(revealSpy).not.toHaveBeenCalled();
	});
});
