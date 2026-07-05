import { describe, it, expect, vi, afterEach } from 'vitest';
import { IToken } from '@faubulous/mentor-rdf-parsers';
import { DocumentTokenSyncService } from '@src/services/document/document-token-sync-service';
import { TokenDelivery } from '@src/services/document/document-token-source.interface';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

describe('DocumentTokenSyncService', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	describe('waitForTokens', () => {
		it('resolves with the delivered tokens', async () => {
			const service = new DocumentTokenSyncService();
			const uri = 'file:///test.sparql';
			const tokens: IToken[] = [{ image: 'PREFIX' } as any];

			const promise = service.waitForTokens(uri, 5000);
			service.deliverTokens(uri, tokens);

			await expect(promise).resolves.toBe(tokens);
		});

		it('cancels the first call when a second call is made for the same URI', async () => {
			const service = new DocumentTokenSyncService();
			const uri = 'file:///test.sparql';

			const first = service.waitForTokens(uri, 5000);
			const second = service.waitForTokens(uri, 5000);

			service.deliverTokens(uri, []);

			await expect(first).rejects.toThrow(/superseded/);
			await expect(second).resolves.toBeDefined();
		});

		it('rejects on timeout', async () => {
			vi.useFakeTimers();
			const service = new DocumentTokenSyncService();
			const uri = 'file:///test.sparql';

			const promise = service.waitForTokens(uri, 200);
			vi.advanceTimersByTime(200);

			await expect(promise).rejects.toThrow(/Timeout/);
		});

		it('does not resolve a waiter for a different URI', async () => {
			vi.useFakeTimers();
			const service = new DocumentTokenSyncService();

			const promise = service.waitForTokens('file:///a.ttl', 200);
			service.deliverTokens('file:///b.ttl', []);

			vi.advanceTimersByTime(200);

			await expect(promise).rejects.toThrow(/Timeout/);
		});
	});

	describe('deliverTokens', () => {
		it('fires onDidDeliverTokens with consumed=true when a waiter existed', async () => {
			const service = new DocumentTokenSyncService();
			const uri = 'file:///test.ttl';
			const tokens: IToken[] = [];
			const deliveries: TokenDelivery[] = [];

			service.onDidDeliverTokens(d => deliveries.push(d));

			const promise = service.waitForTokens(uri, 5000);
			service.deliverTokens(uri, tokens);
			await promise;

			expect(deliveries).toHaveLength(1);
			expect(deliveries[0]).toEqual({ uri, tokens, consumed: true });
		});

		it('fires onDidDeliverTokens with consumed=false when no waiter existed', () => {
			const service = new DocumentTokenSyncService();
			const uri = 'file:///test.ttl';
			const tokens: IToken[] = [];
			const deliveries: TokenDelivery[] = [];

			service.onDidDeliverTokens(d => deliveries.push(d));

			service.deliverTokens(uri, tokens);

			expect(deliveries).toHaveLength(1);
			expect(deliveries[0]).toEqual({ uri, tokens, consumed: false });
		});

		it('does not throw when delivering without any waiter or listener', () => {
			const service = new DocumentTokenSyncService();

			expect(() => service.deliverTokens('file:///test.ttl', [])).not.toThrow();
		});
	});

	describe('load generations', () => {
		it('starts at 1 and increments per beginLoad', () => {
			const service = new DocumentTokenSyncService();
			const uri = 'file:///test.ttl';

			expect(service.beginLoad(uri)).toBe(1);
			expect(service.beginLoad(uri)).toBe(2);
		});

		it('tracks generations per URI independently', () => {
			const service = new DocumentTokenSyncService();

			expect(service.beginLoad('file:///a.ttl')).toBe(1);
			expect(service.beginLoad('file:///b.ttl')).toBe(1);
		});

		it('reports only the newest generation as current', () => {
			const service = new DocumentTokenSyncService();
			const uri = 'file:///test.ttl';

			const g1 = service.beginLoad(uri);
			const g2 = service.beginLoad(uri);

			expect(service.isCurrentLoad(uri, g1)).toBe(false);
			expect(service.isCurrentLoad(uri, g2)).toBe(true);
		});

		it('reports false for a URI that never began a load', () => {
			const service = new DocumentTokenSyncService();

			expect(service.isCurrentLoad('file:///unknown.ttl', 1)).toBe(false);
		});
	});

	describe('dispose', () => {
		it('rejects all pending waitForTokens requests', async () => {
			const service = new DocumentTokenSyncService();

			const promise = service.waitForTokens('file:///test.sparql', 10000);
			service.dispose();

			await expect(promise).rejects.toThrow(/disposed/);
		});
	});
});
