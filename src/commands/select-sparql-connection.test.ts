import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockGetConnections: Mock;
let mockSetQuerySourceForDocument: Mock;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlConnectionService') {
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
		onDidChangeSelection: vi.fn(() => ({ dispose: () => {} })),
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
			onDidChangeSelection: vi.fn((cb: any) => {
				cb([{ connection: mockConn, label: mockConn.endpointUrl }]);
				return { dispose: () => {} };
			}),
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
});
