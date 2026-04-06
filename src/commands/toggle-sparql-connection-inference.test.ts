import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockConnectionService } = vi.hoisted(() => ({
	mockConnectionService: {
		getConnection: vi.fn(),
		getConnectionForDocument: vi.fn(),
		supportsInference: vi.fn(),
		toggleInferenceEnabled: vi.fn(),
		toggleInferenceEnabledForDocument: vi.fn(),
	}
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlConnectionService') return mockConnectionService;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { toggleSparqlConnectionInference } from './toggle-sparql-connection-inference';

beforeEach(() => {
	vi.clearAllMocks();
	(vscode.window as any).activeTextEditor = undefined;
	mockConnectionService.supportsInference.mockReturnValue(true);
	mockConnectionService.getConnection.mockReturnValue(undefined);
	mockConnectionService.toggleInferenceEnabled.mockResolvedValue(true);
});

afterEach(() => {
	(vscode.window as any).activeTextEditor = undefined;
});

describe('toggleSparqlConnectionInference', () => {
	it('should have the correct command id', () => {
		expect(toggleSparqlConnectionInference.id).toBe('mentor.command.toggleSparqlConnectionInference');
	});

	it('should show error when connection is not found', async () => {
		mockConnectionService.getConnection.mockReturnValue(undefined);
		const showError = vi.spyOn(vscode.window, 'showErrorMessage');

		await toggleSparqlConnectionInference.handler(undefined);

		expect(showError).toHaveBeenCalledWith(expect.stringContaining('Connection not found'));
	});

	it('should show error when connection does not support inference', async () => {
		const connection = { id: 'conn1', endpointUrl: 'http://endpoint' };
		mockConnectionService.getConnection.mockReturnValue(connection);
		mockConnectionService.supportsInference.mockReturnValue(false);
		const showError = vi.spyOn(vscode.window, 'showErrorMessage');

		await toggleSparqlConnectionInference.handler(undefined);

		expect(showError).toHaveBeenCalledWith(expect.stringContaining('does not support inference'));
	});

	it('should toggle inference and show status message when successful', async () => {
		const connection = { id: 'conn1', endpointUrl: 'http://endpoint' };
		mockConnectionService.getConnection.mockReturnValue(connection);
		mockConnectionService.supportsInference.mockReturnValue(true);
		mockConnectionService.toggleInferenceEnabled.mockResolvedValue(true);
		const setStatus = vi.spyOn(vscode.window, 'setStatusBarMessage');

		await toggleSparqlConnectionInference.handler(undefined);

		expect(mockConnectionService.toggleInferenceEnabled).toHaveBeenCalledWith('workspace');
		expect(setStatus).toHaveBeenCalledWith(expect.stringContaining('enabled'), expect.any(Number));
	});

	it('should use the connection id when a SparqlConnection is passed', async () => {
		const connection = { id: 'my-conn', endpointUrl: 'http://my-endpoint' };
		mockConnectionService.getConnection.mockReturnValue(connection);
		mockConnectionService.supportsInference.mockReturnValue(true);
		mockConnectionService.toggleInferenceEnabled.mockResolvedValue(false);
		const setStatus = vi.spyOn(vscode.window, 'setStatusBarMessage');

		await toggleSparqlConnectionInference.handler(connection as any);

		expect(mockConnectionService.getConnection).toHaveBeenCalledWith('my-conn');
		expect(setStatus).toHaveBeenCalledWith(expect.stringContaining('disabled'), expect.any(Number));
	});
});
