import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockConnListController } = vi.hoisted(() => ({
	mockConnListController: {
		open: vi.fn(),
	},
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlConnectionsListController') return mockConnListController;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { manageSparqlConnections } from './manage-sparql-connections';

beforeEach(() => {
	vi.clearAllMocks();
	mockConnListController.open.mockResolvedValue(undefined);
});

describe('manageSparqlConnections', () => {
	it('should have the correct command id', () => {
		expect(manageSparqlConnections.id).toBe('mentor.command.manageSparqlConnections');
	});

	it('should call controller.open', async () => {
		await manageSparqlConnections.handler();

		expect(mockConnListController.open).toHaveBeenCalled();
	});
});
