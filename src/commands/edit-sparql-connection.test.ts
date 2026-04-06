import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockConnController } = vi.hoisted(() => ({
	mockConnController: {
		edit: vi.fn(),
	},
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlConnectionController') return mockConnController;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { editSparqlConnection } from './edit-sparql-connection';

beforeEach(() => {
	vi.clearAllMocks();
});

describe('editSparqlConnection', () => {
	it('should have the correct command id', () => {
		expect(editSparqlConnection.id).toBe('mentor.command.editSparqlConnection');
	});

	it('should call controller.edit with the given connection', async () => {
		const connection = { id: 'conn1', endpointUrl: 'http://endpoint' } as any;
		await editSparqlConnection.handler(connection);

		expect(mockConnController.edit).toHaveBeenCalledWith(connection);
	});
});
