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
			if (token === 'ViewRouter') return mockRouter;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { manageSparqlConnections } from '@src/commands/manage-sparql-connections';

beforeEach(() => {
	vi.clearAllMocks();
	mockRouter.open.mockResolvedValue(undefined);
});

describe('manageSparqlConnections', () => {
	it('should have the correct command id', () => {
		expect(manageSparqlConnections.id).toBe('mentor.command.manageSparqlConnections');
	});

	it('should route to the settings panel on the connections section', async () => {
		await manageSparqlConnections.handler();

		expect(mockRouter.open).toHaveBeenCalledWith(
			{ kind: 'settings', section: 'connections' },
			vscode.ViewColumn.Active
		);
	});
});
