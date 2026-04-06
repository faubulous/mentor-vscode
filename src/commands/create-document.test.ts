import * as vscode from 'vscode';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDocument } from './create-document';

const mockShowQuickPick = vi.fn(async () => undefined as any);
const mockExecuteCommand = vi.fn(async () => undefined as any);

const mockDocumentFactory = {
	getSupportedLanguagesInfo: vi.fn(async () => [
		{ id: 'turtle', typeName: 'Turtle File', icon: 'mentor-turtle' },
		{ id: 'sparql', typeName: 'SPARQL File', icon: 'mentor-sparql' },
	]),
};

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({
	serialize: vi.fn()
}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'DocumentFactory') {
				return mockDocumentFactory;
			} else {
				return {};
			}
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => { },
	singleton: () => (t: any) => t,
}));

describe('createDocument', () => {
	beforeEach(() => {
		vi.clearAllMocks();

		vscode.window.showQuickPick = mockShowQuickPick;
		vscode.commands.executeCommand = mockExecuteCommand;
	});

	it('has the correct id', () => {
		expect(createDocument.id).toBe('mentor.command.createDocument');
	});

	it('returns when user cancels quick pick', async () => {
		mockShowQuickPick.mockResolvedValue(undefined);

		await createDocument.handler();

		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});

	it('executes createNotebook command when notebook is selected', async () => {
		const notebookItem = {
			label: '$(mentor-notebook) Mentor Notebook',
			command: 'mentor.command.createNotebook',
			args: undefined
		};

		mockShowQuickPick.mockResolvedValue(notebookItem);

		await createDocument.handler();

		expect(mockExecuteCommand).toHaveBeenCalledWith('mentor.command.createNotebook', undefined);
	});

	it('executes createDocumentFromLanguage for a language item', async () => {
		const turtleItem = {
			label: '$(mentor-turtle)  Turtle File',
			command: 'mentor.command.createDocumentFromLanguage',
			args: 'turtle'
		};

		mockShowQuickPick.mockResolvedValue(turtleItem);

		await createDocument.handler();

		expect(mockExecuteCommand).toHaveBeenCalledWith('mentor.command.createDocumentFromLanguage', 'turtle');
	});

	it('shows quick pick with notebook and language items', async () => {
		mockShowQuickPick.mockResolvedValue(undefined);

		await createDocument.handler();

		const call = mockShowQuickPick.mock.calls[0] as any;
		const callArgs = call[0] as any;

		// First item is notebook, rest are languages
		expect(callArgs[0].command).toBe('mentor.command.createNotebook');
		expect(callArgs.length).toBe(3); // 1 notebook + 2 languages
	});

	it('does not execute command when selected item has no command', async () => {
		const itemWithNoCommand = { label: 'Something', command: undefined };

		mockShowQuickPick.mockResolvedValue(itemWithNoCommand);

		await createDocument.handler();

		expect(mockExecuteCommand).not.toHaveBeenCalled();
	});
});
