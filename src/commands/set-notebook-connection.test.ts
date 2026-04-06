import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockGetConnections: ReturnType<typeof vi.fn>;
let mockNotifyDocumentConnectionChanged: ReturnType<typeof vi.fn>;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlConnectionService') {
				return {
					getConnections: (...args: any[]) => mockGetConnections(...args),
					notifyDocumentConnectionChanged: (...args: any[]) => mockNotifyDocumentConnectionChanged(...args),
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
import { setNotebookConnection } from './set-notebook-connection';

beforeEach(() => {
	mockGetConnections = vi.fn(() => []);
	mockNotifyDocumentConnectionChanged = vi.fn();
	(vscode.window as any).activeNotebookEditor = undefined;
	(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);
	(vscode.window as any).showQuickPick = vi.fn(async () => undefined);
	(vscode.workspace as any).applyEdit = vi.fn(async () => true);
});

describe('setNotebookConnection command', () => {
	it('should have correct id', () => {
		expect(setNotebookConnection.id).toBe('mentor.command.setNotebookConnection');
	});

	it('should show warning when no notebook is available', async () => {
		(vscode.window as any).activeNotebookEditor = undefined;
		await setNotebookConnection.handler();
		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No notebook is currently open.');
	});

	it('should show warning when no connections are configured', async () => {
		mockGetConnections.mockReturnValue([]);
		const mockNotebook = {
			uri: vscode.Uri.parse('file:///test.mentor-notebook'),
			getCells: vi.fn(() => []),
		};
		(vscode.window as any).activeNotebookEditor = { notebook: mockNotebook };
		await setNotebookConnection.handler();
		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No SPARQL connections configured.');
	});

	it('should accept notebook from context.notebook', async () => {
		mockGetConnections.mockReturnValue([]);
		const mockNotebook = {
			uri: vscode.Uri.parse('file:///test.mentor-notebook'),
			getCells: vi.fn(() => []),
		};
		await setNotebookConnection.handler({ notebook: mockNotebook });
		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No SPARQL connections configured.');
	});

	it('should update cell metadata when connection selected', async () => {
		const mockConn = { id: 'conn-1', endpointUrl: 'http://sparql.example.org', description: 'Test' };
		mockGetConnections.mockReturnValue([mockConn]);
		const mockCell = { index: 0, metadata: {} };
		const mockNotebook = {
			uri: vscode.Uri.parse('file:///test.mentor-notebook'),
			getCells: vi.fn(() => [mockCell]),
		};
		(vscode.window as any).activeNotebookEditor = { notebook: mockNotebook };
		(vscode.window as any).showQuickPick = vi.fn(async () => ({
			label: 'Test',
			connection: mockConn,
		}));
		await setNotebookConnection.handler();
		expect(vscode.workspace.applyEdit).toHaveBeenCalled();
		expect(mockNotifyDocumentConnectionChanged).toHaveBeenCalledWith(mockNotebook.uri);
	});
});
