import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { SparqlEndpointTester } from '@src/languages/sparql/services/sparql-endpoint-tester';
import { WORKSPACE_CONNECTION } from '@src/languages/sparql/services/workspace-store';
import { ConfigurationScope } from '@src/utilities/config-scope';
import type { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';

function makeCredentialStorage() {
	return { getCredential: async () => null };
}

function makeTester() {
	return new SparqlEndpointTester(makeCredentialStorage() as any);
}

function makeConnection(): SparqlConnection {
	return {
		id: 'test-endpoint',
		endpointUrl: 'https://example.org/sparql',
		configScope: ConfigurationScope.User,
	};
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('SparqlEndpointTester', () => {
	describe('testConnection', () => {
		it('returns null immediately for the workspace store', async () => {
			const tester = makeTester();
			const result = await tester.testConnection({ ...WORKSPACE_CONNECTION });
			expect(result).toBeNull();
		});

		it('does not fire test events for the workspace store', async () => {
			const tester = makeTester();
			const started = vi.fn();
			tester.onDidConnectionTestStart(started);
			await tester.testConnection({ ...WORKSPACE_CONNECTION });
			expect(started).not.toHaveBeenCalled();
		});

		it('returns an error when fetch fails', async () => {
			const tester = makeTester();
			vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
			const result = await tester.testConnection(makeConnection());
			expect(result).not.toBeNull();
			expect(result?.message).toContain('Network error');
		});

		it('returns null when fetch succeeds (ok response)', async () => {
			const tester = makeTester();
			vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
			const result = await tester.testConnection(makeConnection(), null);
			expect(result).toBeNull();
		});

		it('returns error details when fetch returns non-ok response', async () => {
			const tester = makeTester();
			vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				text: async () => 'Auth required',
			}));
			const result = await tester.testConnection(makeConnection(), null);
			expect(result?.code).toBe(401);
			expect(result?.message).toBe('Auth required');
		});

		it('fires start and end events around a test', async () => {
			const tester = makeTester();
			const started = vi.fn();
			const ended = vi.fn();
			tester.onDidConnectionTestStart(started);
			tester.onDidConnectionTestEnd(ended);

			vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
			const connection = makeConnection();
			await tester.testConnection(connection, null);

			expect(started).toHaveBeenCalledWith(connection);
			expect(ended).toHaveBeenCalledWith({ connection, error: null });
		});

		it('fires the end event with the error on failure', async () => {
			const tester = makeTester();
			const ended = vi.fn();
			tester.onDidConnectionTestEnd(ended);

			vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
			const connection = makeConnection();
			await tester.testConnection(connection, null);

			expect(ended).toHaveBeenCalledWith({
				connection,
				error: expect.objectContaining({ message: 'boom' }),
			});
		});

		it('explains a 401 when no credential is stored on this machine', async () => {
			// Credentials live in machine-local secret storage: a connection synced
			// from another machine arrives without them and fails authentication.
			const tester = makeTester();
			vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				text: async () => 'Auth required',
			}));
			const result = await tester.testConnection(makeConnection());
			expect(result?.code).toBe(401);
			expect(result?.message).toContain('no credentials are stored for this connection on this machine');
			expect(result?.message).toContain('Auth required');
		});

		it('does not rewrite a 401 when the caller supplied the credential explicitly', async () => {
			// An explicit credential (or explicit null) comes from the connection
			// editor, where the user is entering credentials right now.
			const tester = makeTester();
			vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
				ok: false,
				status: 401,
				statusText: 'Unauthorized',
				text: async () => 'Auth required',
			}));
			const result = await tester.testConnection(makeConnection(), null);
			expect(result?.message).toBe('Auth required');
		});

		it('loads the stored credential when none is provided', async () => {
			const getCredential = vi.fn(async () => ({ type: 'bearer', token: 'stored-token' }));
			const tester = new SparqlEndpointTester({ getCredential } as any);

			const fetchMock = vi.fn().mockResolvedValue({ ok: true });
			vi.stubGlobal('fetch', fetchMock);

			await tester.testConnection(makeConnection());

			expect(getCredential).toHaveBeenCalledWith('test-endpoint');
			expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer stored-token');
		});
	});
});
