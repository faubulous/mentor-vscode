import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({ serialize: vi.fn() }));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

vi.mock('@src/utilities', () => ({
	getFileName: vi.fn((uri: string) => uri.split('/').pop() ?? uri),
	getPath: vi.fn((path: string) => '/' + path.split('/').slice(1).join('/')),
}));

vi.mock('@src/providers/workspace-uri', () => ({
	WorkspaceUri: {
		toWorkspaceUri: vi.fn((uri: any) => uri),
	},
}));

const mockWorkspaceFileService = {
	getFilesByLanguageId: vi.fn(async function* (langId: string) {
		yield vscode.Uri.parse('file:///w/ontology.ttl');
		yield vscode.Uri.parse('file:///w/schema.ttl');
	}),
};

const mockDocumentFactory = {
	getLanguageInfo: vi.fn(async (langId: string) => langId === 'turtle' ? {
		id: 'turtle',
		name: 'Turtle',
		typeName: 'Turtle File',
		icon: 'mentor-turtle',
	} : undefined),
};

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'WorkspaceFileService') return mockWorkspaceFileService;
			if (token === 'DocumentFactory') return mockDocumentFactory;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { openFileFromLanguage } from '@src/commands/open-file-from-language';

describe('openFileFromLanguage', () => {
	let mockQuickPick: any;
	let changeSelectionHandlers: Array<(s: any[]) => void>;
	let mockOpenTextDocument: any;
	let mockShowTextDocument: any;
	let mockExecuteCommand: any;

	beforeEach(() => {
		vi.clearAllMocks();
		changeSelectionHandlers = [];

		// Restore async generators after clearAllMocks
		mockWorkspaceFileService.getFilesByLanguageId = vi.fn(async function* () {
			yield vscode.Uri.parse('file:///w/ontology.ttl');
			yield vscode.Uri.parse('file:///w/schema.ttl');
		});
		mockDocumentFactory.getLanguageInfo = vi.fn(async (langId: string) => langId === 'turtle' ? {
			id: 'turtle',
			name: 'Turtle',
			typeName: 'Turtle File',
			icon: 'mentor-turtle',
		} : undefined);

		mockOpenTextDocument = vi.fn(async (uri: any) => ({ uri } as any));
		mockShowTextDocument = vi.fn(async () => undefined as any);
		mockExecuteCommand = vi.fn(async () => undefined as any);

		mockQuickPick = {
			title: '',
			items: [] as any[],
			onDidChangeSelection: vi.fn((handler: any) => {
				changeSelectionHandlers.push(handler);
				return { dispose: () => {} };
			}),
			show: vi.fn(),
			dispose: vi.fn(),
		};

		(vscode.window as any).createQuickPick = vi.fn(() => mockQuickPick);
		(vscode.workspace as any).openTextDocument = mockOpenTextDocument;
		(vscode.window as any).showTextDocument = mockShowTextDocument;
		(vscode.commands as any).executeCommand = mockExecuteCommand;
	});

	it('has the correct id', () => {
		expect(openFileFromLanguage.id).toBe('mentor.command.openFileFromLanguage');
	});

	it('shows quick pick with language files', async () => {
		await openFileFromLanguage.handler('turtle');
		expect(mockQuickPick.show).toHaveBeenCalled();
		// Should have 2 files + separator + create item = 4 items
		expect(mockQuickPick.items.length).toBe(4);
	});

	it('shows no files found message for unknown language', async () => {
		mockWorkspaceFileService.getFilesByLanguageId = vi.fn(async function* () {});
		mockDocumentFactory.getLanguageInfo.mockResolvedValue({
			id: 'unknown',
			name: 'Unknown',
			typeName: 'Unknown File',
			icon: 'file',
		} as any);
		await openFileFromLanguage.handler('unknown');
		expect(mockQuickPick.items[0].label).toContain('No files found');
	});

	it('opens document when file item is selected', async () => {
		await openFileFromLanguage.handler('turtle');
		const fileItem = mockQuickPick.items.find((i: any) => i.iri);
		expect(fileItem).toBeDefined();
		for (const handler of changeSelectionHandlers) {
			handler([fileItem]);
		}
		// Allow async handler to run
		await vi.waitFor(() => {
			expect(mockOpenTextDocument).toHaveBeenCalledWith(fileItem.iri);
		});
	});

	it('executes createDocumentFromLanguage when create item is selected', async () => {
		await openFileFromLanguage.handler('turtle');
		const createItem = mockQuickPick.items.find((i: any) => i.command === 'mentor.command.createDocumentFromLanguage');
		expect(createItem).toBeDefined();
		for (const handler of changeSelectionHandlers) {
			handler([createItem]);
		}
		await vi.waitFor(() => {
			expect(mockExecuteCommand).toHaveBeenCalledWith('mentor.command.createDocumentFromLanguage', 'turtle');
		});
	});

	it('does nothing when separator-like item with no iri or command is selected', async () => {
		await openFileFromLanguage.handler('turtle');
		const separatorItem = mockQuickPick.items.find((i: any) => !i.iri && !i.command);
		if (separatorItem) {
			for (const handler of changeSelectionHandlers) {
				handler([separatorItem]);
			}
		}
		await new Promise(r => setTimeout(r, 0));
		expect(mockOpenTextDocument).not.toHaveBeenCalled();
		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});
});
