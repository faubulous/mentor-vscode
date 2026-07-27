import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockSetInferenceEnabledForNotebook: Mock;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlConnectionRegistry' || token === 'DocumentConnectionService') {
				return {
					setInferenceEnabledForNotebook: (...args: any[]) => mockSetInferenceEnabledForNotebook(...args),
				};
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { setNotebookInference } from '@src/commands/notebook/set-notebook-inference';

beforeEach(() => {
	mockSetInferenceEnabledForNotebook = vi.fn(async () => []);
	(vscode.window as any).activeNotebookEditor = undefined;
	(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);
	(vscode.window as any).showQuickPick = vi.fn(async () => undefined);
	(vscode.workspace as any).applyEdit = vi.fn(async () => true);
});

describe('setNotebookInference command', () => {
	it('should have correct id', () => {
		expect(setNotebookInference.id).toBe('mentor.command.setNotebookInference');
	});

	it('should show warning when no notebook is available', async () => {
		(vscode.window as any).activeNotebookEditor = undefined;
		await setNotebookInference.handler();
		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No notebook is currently open.');
	});

	it('should do nothing when user cancels quick pick', async () => {
		const mockNotebook = {
			uri: vscode.Uri.parse('file:///test.mentor-notebook'),
			getCells: vi.fn(() => []),
		};
		(vscode.window as any).activeNotebookEditor = { notebook: mockNotebook };
		(vscode.window as any).showQuickPick = vi.fn(async () => undefined);
		await setNotebookInference.handler();
		expect(mockSetInferenceEnabledForNotebook).not.toHaveBeenCalled();
	});

	it('should delegate the update to setInferenceEnabledForNotebook', async () => {
		const mockCell = { index: 0, metadata: {} };
		const mockNotebook = {
			uri: vscode.Uri.parse('file:///test.mentor-notebook'),
			getCells: vi.fn(() => [mockCell]),
		};
		(vscode.window as any).activeNotebookEditor = { notebook: mockNotebook };
		(vscode.window as any).showQuickPick = vi.fn(async () => ({
			label: 'On',
			value: true,
		}));
		await setNotebookInference.handler();

		// The service applies the bulk edit and fires the change event once per
		// cell — see setConnectionForNotebook for the rationale.
		expect(mockSetInferenceEnabledForNotebook).toHaveBeenCalledWith(mockNotebook, true);
	});
});
