import { describe, it, expect } from 'vitest';
import { CredentialFactory } from '@src/services/core/credential-factory';

describe('CredentialFactory', () => {
	describe('getCredentialTypes', () => {
		it('should return the supported credential types', () => {
			const types = CredentialFactory.getCredentialTypes();
			expect(types).toEqual(['basic', 'bearer', 'microsoft', 'entra-client-credentials']);
		});
	});

	describe('createBasicAuthCredential', () => {
		it('should create a basic credential with given username and password', () => {
			const cred = CredentialFactory.createBasicAuthCredential('user', 'pass');
			expect(cred.type).toBe('basic');
			expect(cred.username).toBe('user');
			expect(cred.password).toBe('pass');
		});

		it('should default username and password to empty strings', () => {
			const cred = CredentialFactory.createBasicAuthCredential();
			expect(cred.username).toBe('');
			expect(cred.password).toBe('');
		});

		it('should accept empty string username', () => {
			const cred = CredentialFactory.createBasicAuthCredential('', 'secret');
			expect(cred.username).toBe('');
			expect(cred.password).toBe('secret');
		});
	});

	describe('createBearerAuthCredential', () => {
		it('should create a bearer credential with given token and prefix', () => {
			const cred = CredentialFactory.createBearerAuthCredential('mytoken', 'Token');
			expect(cred.type).toBe('bearer');
			expect(cred.token).toBe('mytoken');
			expect(cred.prefix).toBe('Token');
		});

		it('should default token to empty string and prefix to "Bearer"', () => {
			const cred = CredentialFactory.createBearerAuthCredential();
			expect(cred.token).toBe('');
			expect(cred.prefix).toBe('Bearer');
		});

		it('should accept a custom prefix', () => {
			const cred = CredentialFactory.createBearerAuthCredential('tok', 'Basic');
			expect(cred.prefix).toBe('Basic');
		});
	});

	describe('createMicrosoftAuthCredential', () => {
		it('should create a microsoft credential with given scopes', () => {
			const scopes = ['https://example.com/.default'];
			const cred = CredentialFactory.createMicrosoftAuthCredential(scopes);
			expect(cred.type).toBe('microsoft');
			expect(cred.scopes).toEqual(scopes);
			expect(cred.sessionId).toBeUndefined();
			expect(cred.accessToken).toBeUndefined();
		});

		it('should default scopes to the graph.microsoft.com default scope', () => {
			const cred = CredentialFactory.createMicrosoftAuthCredential();
			expect(cred.scopes).toEqual(['https://graph.microsoft.com/.default']);
		});

		it('should include sessionId and accessToken when provided', () => {
			const cred = CredentialFactory.createMicrosoftAuthCredential(
				['https://graph.microsoft.com/.default'],
				'session-123',
				'token-abc'
			);
			expect(cred.sessionId).toBe('session-123');
			expect(cred.accessToken).toBe('token-abc');
		});

		it('should allow overriding only sessionId', () => {
			const cred = CredentialFactory.createMicrosoftAuthCredential(undefined, 'sid');
			expect(cred.sessionId).toBe('sid');
			expect(cred.accessToken).toBeUndefined();
		});
	});

	describe('createEntraClientCredential', () => {
		it('should create an entra-client-credentials credential with all defaults', () => {
			const cred = CredentialFactory.createEntraClientCredential();
			expect(cred.type).toBe('entra-client-credentials');
			expect(cred.tenantId).toBe('');
			expect(cred.clientId).toBe('');
			expect(cred.clientSecret).toBe('');
			expect(cred.scopes).toEqual(['https://graph.microsoft.com/.default']);
		});

		it('should create an entra-client-credentials credential with given values', () => {
			const cred = CredentialFactory.createEntraClientCredential(
				'tenant-id',
				'client-id',
				'client-secret',
				['https://example.com/.default']
			);
			expect(cred.tenantId).toBe('tenant-id');
			expect(cred.clientId).toBe('client-id');
			expect(cred.clientSecret).toBe('client-secret');
			expect(cred.scopes).toEqual(['https://example.com/.default']);
		});

		it('should use default scopes when not provided', () => {
			const cred = CredentialFactory.createEntraClientCredential('t', 'c', 's');
			expect(cred.scopes).toEqual(['https://graph.microsoft.com/.default']);
		});
	});
});
