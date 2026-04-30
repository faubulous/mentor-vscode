import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockConnService, mockCredService } = vi.hoisted(() => ({
	mockConnService: {
		deleteConnection: vi.fn(),
		saveConfiguration: vi.fn(),
	},
	mockCredService: {
		deleteCredential: vi.fn(),
	},
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlConnectionService') return mockConnService;
			if (token === 'CredentialStorageService') return mockCredService;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { deleteSparqlConnection } from '@src/commands/delete-sparql-connection';

beforeEach(() => {
	vi.clearAllMocks();
	mockConnService.deleteConnection.mockResolvedValue(undefined);
	mockConnService.saveConfiguration.mockResolvedValue(undefined);
	mockCredService.deleteCredential.mockResolvedValue(undefined);
});

describe('deleteSparqlConnection', () => {
	it('should have the correct command id', () => {
		expect(deleteSparqlConnection.id).toBe('mentor.command.deleteSparqlConnection');
	});

	it('should not delete when user does not confirm', async () => {
		vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined as any);

		const connection = { id: 'conn1', endpointUrl: 'http://endpoint' } as any;
		await deleteSparqlConnection.handler(connection);

		expect(mockConnService.deleteConnection).not.toHaveBeenCalled();
	});

	it('should delete connection and credentials when user confirms', async () => {
		vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue('Delete' as any);

		const connection = { id: 'conn1', endpointUrl: 'http://endpoint' } as any;
		await deleteSparqlConnection.handler(connection);

		expect(mockConnService.deleteConnection).toHaveBeenCalledWith('conn1');
		expect(mockConnService.saveConfiguration).toHaveBeenCalled();
		expect(mockCredService.deleteCredential).toHaveBeenCalledWith('conn1');
	});

	it('should show success message after deletion', async () => {
		vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue('Delete' as any);
		const info = vi.spyOn(vscode.window, 'showInformationMessage');

		await deleteSparqlConnection.handler({ id: 'conn1' } as any);

		expect(info).toHaveBeenCalledWith(expect.stringContaining('deleted'));
	});
});
