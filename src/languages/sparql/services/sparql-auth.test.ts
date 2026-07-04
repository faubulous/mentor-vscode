import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

beforeEach(() => {
	vi.restoreAllMocks();
});

import { AuthCredential } from '@src/services/core/credential';
import { getAuthorizationHeader, getAuthorizationHeaderProvider } from '@src/languages/sparql/services/sparql-auth';

describe('sparql-auth', () => {
	describe('getAuthorizationHeader', () => {
		it('returns undefined when no credential is provided', async () => {
			expect(await getAuthorizationHeader(undefined)).toBeUndefined();
		});

		it('returns a Basic header for basic credentials', async () => {
			const cred: AuthCredential = { type: 'basic', username: 'user', password: 'pass' } as any;
			const header = await getAuthorizationHeader(cred);
			expect(header).toMatch(/^Basic /);
			expect(atob(header!.replace('Basic ', ''))).toBe('user:pass');
		});

		it('returns a Bearer header for bearer credentials', async () => {
			const cred: AuthCredential = { type: 'bearer', token: 'my-token' } as any;
			expect(await getAuthorizationHeader(cred)).toBe('Bearer my-token');
		});

		it('honors a custom prefix for bearer credentials', async () => {
			const cred: AuthCredential = { type: 'bearer', token: 'my-token', prefix: 'Token' } as any;
			expect(await getAuthorizationHeader(cred)).toBe('Token my-token');
		});

		it('returns a Bearer header for microsoft credentials', async () => {
			const cred: AuthCredential = { type: 'microsoft', accessToken: 'ms-token' } as any;
			expect(await getAuthorizationHeader(cred)).toBe('Bearer ms-token');
		});

		it('returns undefined for a microsoft credential without an access token', async () => {
			const cred: AuthCredential = { type: 'microsoft' } as any;
			expect(await getAuthorizationHeader(cred)).toBeUndefined();
		});

		it('acquires a token for entra-client-credentials', async () => {
			const { EntraClientCredentialService } = await import('@src/services/core/entra-client-credential-service');
			vi.spyOn(EntraClientCredentialService.prototype, 'acquireToken').mockResolvedValue('entra-token');

			const cred: any = { type: 'entra-client-credentials', tenantId: 't', clientId: 'c', clientSecret: 's' };
			expect(await getAuthorizationHeader(cred)).toBe('Bearer entra-token');
		});
	});

	describe('getAuthorizationHeaderProvider', () => {
		it('returns undefined for unusable credentials so callers can skip header injection', () => {
			expect(getAuthorizationHeaderProvider(undefined)).toBeUndefined();
			expect(getAuthorizationHeaderProvider({ type: 'microsoft' } as any)).toBeUndefined();
			expect(getAuthorizationHeaderProvider({ type: 'unknown' } as any)).toBeUndefined();
		});

		it('acquires a fresh entra token on every invocation', async () => {
			const { EntraClientCredentialService } = await import('@src/services/core/entra-client-credential-service');
			const acquire = vi.spyOn(EntraClientCredentialService.prototype, 'acquireToken')
				.mockResolvedValueOnce('token-1')
				.mockResolvedValueOnce('token-2');

			const cred: any = { type: 'entra-client-credentials', tenantId: 't', clientId: 'c', clientSecret: 's' };
			const provider = getAuthorizationHeaderProvider(cred)!;

			expect(await provider()).toBe('Bearer token-1');
			expect(await provider()).toBe('Bearer token-2');
			expect(acquire).toHaveBeenCalledTimes(2);
		});
	});
});
