import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn(() => ({})),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { executeNotebookCell } from '@src/commands/execute-notebook-cell';

beforeEach(() => {
	(vscode.window as any).showErrorMessage = vi.fn(async () => undefined);
	(vscode.window as any).showNotebookDocument = vi.fn(async () => ({ selection: undefined }));
	(vscode.workspace as any).openNotebookDocument = vi.fn(async () => ({
		uri: vscode.Uri.parse('file:///test.mentor-notebook'),
		cellCount: 0,
		getCells: vi.fn(() => []),
		cellAt: vi.fn(() => null),
	}));
});

describe('executeNotebookCell command', () => {
	it('should have correct id', () => {
		expect(executeNotebookCell.id).toBe('mentor.command.executeNotebookCell');
	});

	it('should show error when cell index is out of range', async () => {
		(vscode.workspace as any).openNotebookDocument = vi.fn(async () => ({
			uri: vscode.Uri.parse('file:///test.mentor-notebook'),
			cellCount: 2,
			getCells: vi.fn(() => []),
			cellAt: vi.fn(() => null),
		}));
		(vscode.window as any).showNotebookDocument = vi.fn(async () => ({ selection: undefined }));
		await executeNotebookCell.handler('file:///test.mentor-notebook', 5);
		expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Cell index 5 is out of range');
	});

	it('should execute notebook cell command when cell index is valid', async () => {
		const mockCell = { index: 0, notebook: { uri: vscode.Uri.parse('file:///test.mentor-notebook') } };
		const mockEditor = { selection: undefined as any };
		(vscode.workspace as any).openNotebookDocument = vi.fn(async () => ({
			uri: vscode.Uri.parse('file:///test.mentor-notebook'),
			cellCount: 3,
			getCells: vi.fn(() => []),
			cellAt: vi.fn(() => mockCell),
		}));
		(vscode.window as any).showNotebookDocument = vi.fn(async () => mockEditor);
		const executeSpy = vi.spyOn(vscode.commands, 'executeCommand');
		await executeNotebookCell.handler('file:///test.mentor-notebook', 0);
		expect(executeSpy).toHaveBeenCalledWith('notebook.cell.execute', {
			uri: mockCell.notebook.uri,
			cellIndex: mockCell.index,
		});
	});
});
