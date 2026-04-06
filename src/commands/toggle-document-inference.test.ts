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
import { toggleDocumentInference } from './toggle-document-inference';

beforeEach(() => {
	vi.clearAllMocks();
	(vscode.window as any).activeTextEditor = undefined;
	mockConnectionService.supportsInference.mockReturnValue(true);
	mockConnectionService.getConnectionForDocument.mockReturnValue(undefined);
	mockConnectionService.toggleInferenceEnabledForDocument.mockResolvedValue(true);
});

afterEach(() => {
	(vscode.window as any).activeTextEditor = undefined;
});

describe('toggleDocumentInference', () => {
	it('should have the correct command id', () => {
		expect(toggleDocumentInference.id).toBe('mentor.command.toggleDocumentInference');
	});

	it('should show error when no document URI and no active editor', async () => {
		const showError = vi.spyOn(vscode.window, 'showErrorMessage');
		await toggleDocumentInference.handler(undefined);
		expect(showError).toHaveBeenCalledWith(expect.stringContaining('No document selected'));
	});

	it('should show error when connection does not support inference', async () => {
		const docUri = vscode.Uri.parse('file:///doc.ttl');
		mockConnectionService.getConnectionForDocument.mockReturnValue({ endpointUrl: 'http://endpoint' });
		mockConnectionService.supportsInference.mockReturnValue(false);
		const showError = vi.spyOn(vscode.window, 'showErrorMessage');

		await toggleDocumentInference.handler(docUri as any);

		expect(showError).toHaveBeenCalledWith(expect.stringContaining('does not support inference'));
	});

	it('should toggle inference and show status message when connection supports it', async () => {
		const docUri = vscode.Uri.parse('file:///doc.ttl');
		mockConnectionService.getConnectionForDocument.mockReturnValue({ endpointUrl: 'http://endpoint' });
		mockConnectionService.supportsInference.mockReturnValue(true);
		mockConnectionService.toggleInferenceEnabledForDocument.mockResolvedValue(true);
		const setStatus = vi.spyOn(vscode.window, 'setStatusBarMessage');

		await toggleDocumentInference.handler(docUri as any);

		expect(mockConnectionService.toggleInferenceEnabledForDocument).toHaveBeenCalledWith(docUri);
		expect(setStatus).toHaveBeenCalledWith(expect.stringContaining('enabled'), expect.any(Number));
	});

	it('should use activeTextEditor URI when no documentUri is passed', async () => {
		const docUri = vscode.Uri.parse('file:///editor.ttl');
		(vscode.window as any).activeTextEditor = { document: { uri: docUri } };
		mockConnectionService.getConnectionForDocument.mockReturnValue({ endpointUrl: 'http://endpoint' });
		mockConnectionService.supportsInference.mockReturnValue(true);
		mockConnectionService.toggleInferenceEnabledForDocument.mockResolvedValue(false);
		const setStatus = vi.spyOn(vscode.window, 'setStatusBarMessage');

		await toggleDocumentInference.handler(undefined);

		expect(mockConnectionService.toggleInferenceEnabledForDocument).toHaveBeenCalledWith(docUri);
		expect(setStatus).toHaveBeenCalledWith(expect.stringContaining('disabled'), expect.any(Number));
	});
});
