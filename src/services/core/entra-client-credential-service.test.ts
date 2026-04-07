import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EntraClientCredentialService } from './entra-client-credential-service';
import type { EntraClientAuthCredential } from './credential';

const credential: EntraClientAuthCredential = {
	type: 'entra-client-credentials',
	tenantId: 'tenant-id',
	clientId: 'client-id',
	clientSecret: 'client-secret',
	scopes: ['https://example.com/.default'],
};

const mockFetch = vi.fn();

function mockFetchSuccess(accessToken: string, expiresIn = 3600) {
	mockFetch.mockResolvedValue({
		ok: true,
		json: async () => ({ access_token: accessToken, token_type: 'Bearer', expires_in: expiresIn }),
	});
}

function mockFetchFailureJson(status: number, error: string, description: string) {
	mockFetch.mockResolvedValue({
		ok: false,
		status,
		statusText: 'Unauthorized',
		json: async () => ({ error, error_description: description }),
		text: async () => '',
	});
}

function mockFetchFailureText(status: number, statusText: string, body: string) {
	mockFetch.mockResolvedValue({
		ok: false,
		status,
		statusText,
		json: async () => { throw new Error('not JSON'); },
		text: async () => body,
	});
}

let service: EntraClientCredentialService;

beforeEach(() => {
	vi.clearAllMocks();
	vi.stubGlobal('fetch', mockFetch);
	service = new EntraClientCredentialService();
	service.clearAllCaches();
});

describe('EntraClientCredentialService', () => {
	describe('acquireToken', () => {
		it('should fetch a token from the correct endpoint', async () => {
			mockFetchSuccess('tok-1');
			await service.acquireToken(credential);
			const url = mockFetch.mock.calls[0][0] as string;
			expect(url).toBe(`https://login.microsoftonline.com/${credential.tenantId}/oauth2/v2.0/token`);
		});

		it('should POST with client_credentials grant and correct parameters', async () => {
			mockFetchSuccess('tok-1');
			await service.acquireToken(credential);
			const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
			expect(init.method).toBe('POST');
			const body = new URLSearchParams(init.body as string);
			expect(body.get('grant_type')).toBe('client_credentials');
			expect(body.get('client_id')).toBe(credential.clientId);
			expect(body.get('client_secret')).toBe(credential.clientSecret);
			expect(body.get('scope')).toBe(credential.scopes.join(' '));
		});

		it('should return the access token from the response', async () => {
			mockFetchSuccess('my-access-token');
			const token = await service.acquireToken(credential);
			expect(token).toBe('my-access-token');
		});

		it('should return the cached token on a second call without fetching again', async () => {
			mockFetchSuccess('cached-token', 3600);
			await service.acquireToken(credential);
			const token = await service.acquireToken(credential);
			expect(token).toBe('cached-token');
			expect(mockFetch).toHaveBeenCalledOnce();
		});

		it('should fetch a new token after the cache is cleared', async () => {
			mockFetchSuccess('first-token', 3600);
			await service.acquireToken(credential);
			service.clearCache(credential);
			mockFetchSuccess('second-token', 3600);
			const token = await service.acquireToken(credential);
			expect(token).toBe('second-token');
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('should fetch a new token when the cached token is about to expire', async () => {
			// Cache a token that expires in 4 minutes (within the 5-minute buffer)
			mockFetchSuccess('expiring-token', 4 * 60);
			await service.acquireToken(credential);
			mockFetchSuccess('fresh-token', 3600);
			const token = await service.acquireToken(credential);
			expect(token).toBe('fresh-token');
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});

		it('should throw with error_description when the endpoint returns an error JSON body', async () => {
			mockFetchFailureJson(401, 'invalid_client', 'AADSTS70011: The provided value for the input parameter scope is not valid.');
			await expect(service.acquireToken(credential)).rejects.toThrow(
				'AADSTS70011: The provided value for the input parameter scope is not valid.'
			);
		});

		it('should throw with error field when error_description is absent', async () => {
			mockFetch.mockResolvedValue({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				json: async () => ({ error: 'invalid_client' }),
				text: async () => '',
			});
			await expect(service.acquireToken(credential)).rejects.toThrow('invalid_client');
		});

		it('should throw with response text when error body is not JSON', async () => {
			mockFetchFailureText(500, 'Internal Server Error', 'upstream error');
			await expect(service.acquireToken(credential)).rejects.toThrow('upstream error');
		});

		it('should throw with statusText when error body is not JSON and response text is empty', async () => {
			mockFetchFailureText(503, 'Service Unavailable', '');
			await expect(service.acquireToken(credential)).rejects.toThrow('Service Unavailable');
		});

		it('should cache tokens independently per tenant/client combination', async () => {
			const credential2: EntraClientAuthCredential = { ...credential, tenantId: 'other-tenant' };
			mockFetchSuccess('token-a', 3600);
			const tokenA = await service.acquireToken(credential);
			mockFetchSuccess('token-b', 3600);
			const tokenB = await service.acquireToken(credential2);
			expect(tokenA).toBe('token-a');
			expect(tokenB).toBe('token-b');
			// Both are now cached — no further fetch calls
			await service.acquireToken(credential);
			await service.acquireToken(credential2);
			expect(mockFetch).toHaveBeenCalledTimes(2);
		});
	});

	describe('clearCache', () => {
		it('should remove only the specified credential from the cache', async () => {
			const credential2: EntraClientAuthCredential = { ...credential, clientId: 'other-client' };
			mockFetchSuccess('token-1', 3600);
			await service.acquireToken(credential);
			mockFetchSuccess('token-2', 3600);
			await service.acquireToken(credential2);
			service.clearCache(credential);
			mockFetchSuccess('token-1-new', 3600);
			await service.acquireToken(credential);
			// credential was evicted and re-fetched; credential2 still cached
			await service.acquireToken(credential2);
			expect(mockFetch).toHaveBeenCalledTimes(3);
		});
	});

	describe('clearAllCaches', () => {
		it('should evict all cached tokens', async () => {
			const credential2: EntraClientAuthCredential = { ...credential, clientId: 'other-client' };
			mockFetchSuccess('token-1', 3600);
			await service.acquireToken(credential);
			mockFetchSuccess('token-2', 3600);
			await service.acquireToken(credential2);
			service.clearAllCaches();
			mockFetchSuccess('token-1-new', 3600);
			await service.acquireToken(credential);
			mockFetchSuccess('token-2-new', 3600);
			await service.acquireToken(credential2);
			expect(mockFetch).toHaveBeenCalledTimes(4);
		});
	});
});
