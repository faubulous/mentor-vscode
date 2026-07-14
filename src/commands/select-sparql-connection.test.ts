import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockGetConnections: Mock;
let mockSetQuerySourceForDocument: Mock;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlConnectionRegistry' || token === 'DocumentConnectionService') {
				return {
					getConnections: (...args: any[]) => mockGetConnections(...args),
					setQuerySourceForDocument: (...args: any[]) => mockSetQuerySourceForDocument(...args),
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
import { selectSparqlConnection } from '@src/commands/select-sparql-connection';

beforeEach(() => {
	mockGetConnections = vi.fn(async () => []);
	mockSetQuerySourceForDocument = vi.fn(async () => {});
	(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);
	(vscode.window as any).showErrorMessage = vi.fn(async () => undefined);
	(vscode.window as any).showQuickPick = vi.fn(async () => undefined);
	(vscode.window as any).createQuickPick = vi.fn(() => ({
		title: '',
		placeholder: '',
		items: [] as any[],
		buttons: [] as any[],
		onDidChangeSelection: vi.fn(() => ({ dispose: () => {} })),
		onDidTriggerButton: vi.fn(() => ({ dispose: () => {} })),
		onDidTriggerItemButton: vi.fn(() => ({ dispose: () => {} })),
		onDidHide: vi.fn(() => ({ dispose: () => {} })),
		show: vi.fn(),
		hide: vi.fn(),
		dispose: vi.fn(),
	}));
});

describe('selectSparqlConnection command', () => {
	it('should have correct id', () => {
		expect(selectSparqlConnection.id).toBe('mentor.command.selectSparqlConnection');
	});

	it('should show warning when no document is provided', async () => {
		await (selectSparqlConnection.handler as any)(null);
		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No document valid was provided.');
	});

	it('should show warning when no connections are configured', async () => {
		mockGetConnections.mockResolvedValue([]);
		const mockDoc = { uri: vscode.Uri.parse('file:///test.ttl') } as any;
		await selectSparqlConnection.handler(mockDoc);
		expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('No SPARQL endpoints configured. Please add one first.');
	});

	it('should show quick pick when connections are available', async () => {
		const mockConn = { id: 'c1', endpointUrl: 'http://sparql.example.org', description: 'Test' };
		mockGetConnections.mockResolvedValue([mockConn]);
		const mockDoc = { uri: vscode.Uri.parse('file:///test.ttl') } as any;
		const mockQP = {
			items: [] as any[],
			placeholder: '',
			buttons: [] as any[],
			onDidChangeSelection: vi.fn((cb: any) => {
				cb([{ connection: mockConn, label: mockConn.endpointUrl }]);
				return { dispose: () => {} };
			}),
			onDidTriggerButton: vi.fn(() => ({ dispose: () => {} })),
			onDidTriggerItemButton: vi.fn(() => ({ dispose: () => {} })),
			onDidHide: vi.fn(() => ({ dispose: () => {} })),
			show: vi.fn(),
			hide: vi.fn(),
			dispose: vi.fn(),
		};
		(vscode.window as any).createQuickPick = vi.fn(() => mockQP);
		await selectSparqlConnection.handler(mockDoc);
		expect(mockSetQuerySourceForDocument).toHaveBeenCalledWith(mockDoc.uri, mockConn.id);
	});

	it('offers a manage-connections title button instead of a list item', async () => {
		const mockConn = { id: 'c1', endpointUrl: 'http://sparql.example.org', description: 'Test' };
		mockGetConnections.mockResolvedValue([mockConn]);
		const mockDoc = { uri: vscode.Uri.parse('file:///test.ttl') } as any;

		let triggerButton: ((button: any) => void) | undefined;

		const mockQP = {
			items: [] as any[],
			placeholder: '',
			buttons: [] as any[],
			onDidChangeSelection: vi.fn(() => ({ dispose: () => {} })),
			onDidTriggerButton: vi.fn((cb: any) => {
				triggerButton = cb;
				return { dispose: () => {} };
			}),
			onDidTriggerItemButton: vi.fn(() => ({ dispose: () => {} })),
			onDidHide: vi.fn(() => ({ dispose: () => {} })),
			show: vi.fn(),
			hide: vi.fn(),
			dispose: vi.fn(),
		};
		(vscode.window as any).createQuickPick = vi.fn(() => mockQP);
		(vscode.commands as any).executeCommand = vi.fn(async () => undefined);

		await selectSparqlConnection.handler(mockDoc);

		// No "Manage Connections" list item; only the connection itself.
		expect(mockQP.items.some((item: any) => item.command)).toBe(false);
		expect(mockQP.items.length).toBe(1);

		// A gear title button opens the connection settings.
		expect(mockQP.buttons.length).toBe(1);

		triggerButton!(mockQP.buttons[0]);

		expect(vscode.commands.executeCommand).toHaveBeenCalledWith('mentor.command.manageSparqlConnections');
		expect(mockQP.hide).toHaveBeenCalled();
	});
});
