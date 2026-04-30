import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockConnService, mockConnController } = vi.hoisted(() => ({
	mockConnService: {
		createConnection: vi.fn(),
		saveConfiguration: vi.fn(),
	},
	mockConnController: {
		edit: vi.fn(),
	},
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlConnectionService') return mockConnService;
			if (token === 'SparqlConnectionController') return mockConnController;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { createSparqlConnection } from '@src/commands/create-sparql-connection';

beforeEach(() => {
	vi.clearAllMocks();
	mockConnService.createConnection.mockResolvedValue({ id: 'new-conn', endpointUrl: 'http://endpoint' });
	mockConnService.saveConfiguration.mockResolvedValue(undefined);
});

describe('createSparqlConnection', () => {
	it('should have the correct command id', () => {
		expect(createSparqlConnection.id).toBe('mentor.command.createSparqlConnection');
	});

	it('should call createConnection and then edit the new connection', async () => {
		await createSparqlConnection.handler();

		expect(mockConnService.createConnection).toHaveBeenCalled();
		expect(mockConnController.edit).toHaveBeenCalledWith({ id: 'new-conn', endpointUrl: 'http://endpoint' });
	});
});
