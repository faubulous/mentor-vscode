import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockRouter } = vi.hoisted(() => ({
	mockRouter: {
		open: vi.fn(),
	},
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'WebviewRouter') return mockRouter;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { editSparqlConnection } from '@src/commands/edit-sparql-connection';

beforeEach(() => {
	vi.clearAllMocks();
	mockRouter.open.mockResolvedValue(undefined);
});

describe('editSparqlConnection', () => {
	it('should have the correct command id', () => {
		expect(editSparqlConnection.id).toBe('mentor.command.editSparqlConnection');
	});

	it('should route to the connections section with the given connection', async () => {
		const connection = { id: 'conn1', endpointUrl: 'http://endpoint' } as any;
		await editSparqlConnection.handler(connection);

		expect(mockRouter.open).toHaveBeenCalledWith(
			{ kind: 'settings', section: 'connections', params: { connection } },
			vscode.ViewColumn.Active
		);
	});
});
