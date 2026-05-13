import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockConnService, mockRouter } = vi.hoisted(() => ({
	mockConnService: {
		createConnection: vi.fn(),
		saveConfiguration: vi.fn(),
	},
	mockRouter: {
		open: vi.fn(),
	},
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlConnectionService') return mockConnService;
			if (token === 'ViewRouter') return mockRouter;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { createSparqlConnection } from '@src/commands/create-sparql-connection';

beforeEach(() => {
	vi.clearAllMocks();
	mockConnService.createConnection.mockResolvedValue({ id: 'new-conn', endpointUrl: 'http://endpoint' });
	mockConnService.saveConfiguration.mockResolvedValue(undefined);
	mockRouter.open.mockResolvedValue(undefined);
});

describe('createSparqlConnection', () => {
	it('should have the correct command id', () => {
		expect(createSparqlConnection.id).toBe('mentor.command.createSparqlConnection');
	});

	it('should call createConnection and route to the connections section with the new connection', async () => {
		await createSparqlConnection.handler();

		expect(mockConnService.createConnection).toHaveBeenCalled();
		expect(mockRouter.open).toHaveBeenCalledWith(
			{ kind: 'settings', section: 'connections', params: { connection: { id: 'new-conn', endpointUrl: 'http://endpoint' } } },
			vscode.ViewColumn.Active
		);
	});
});
