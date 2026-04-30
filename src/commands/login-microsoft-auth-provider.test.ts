import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

vi.mock('@src/services/core/credential-factory', () => ({
	CredentialFactory: {
		createMicrosoftAuthCredential: vi.fn((_scopes: any, _sessionId: any, _token: any) => ({ type: 'microsoft', token: _token })),
	},
}));

vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn(() => ({})) },
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { loginMicrosoftAuthProvider } from '@src/commands/login-microsoft-auth-provider';

beforeEach(() => {
	(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);
	(vscode.window as any).showInformationMessage = vi.fn(async () => undefined);
	(vscode.authentication as any).getSession = vi.fn(async () => undefined);
});

describe('loginMicrosoftAuthProvider command', () => {
	it('should have correct id', () => {
		expect(loginMicrosoftAuthProvider.id).toBe('mentor.command.loginMicrosoftAuthProvider');
	});

	it('should show warning when authentication returns null session', async () => {
		(vscode.authentication as any).getSession = vi.fn(async () => null);
		await loginMicrosoftAuthProvider.handler();
		expect(vscode.window.showWarningMessage).toHaveBeenCalled();
	});

	it('should show information message on successful authentication', async () => {
		(vscode.authentication as any).getSession = vi.fn(async () => ({
			id: 'session-1',
			accessToken: 'token-abc',
			account: { id: 'user-1', label: 'User' },
			scopes: ['https://graph.microsoft.com/.default'],
		}));
		const result = await loginMicrosoftAuthProvider.handler();
		expect(vscode.window.showInformationMessage).toHaveBeenCalled();
		expect(result).toBeDefined();
	});

	it('should show warning when authentication session is undefined', async () => {
		(vscode.authentication as any).getSession = vi.fn(async () => undefined);
		const result = await loginMicrosoftAuthProvider.handler();
		expect(vscode.window.showWarningMessage).toHaveBeenCalled();
		expect(result).toBeNull();
	});
});
