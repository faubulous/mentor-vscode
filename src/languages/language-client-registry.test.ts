import { describe, it, expect, vi } from 'vitest';
import { LanguageClientRegistry } from '@src/languages/language-client-registry';

describe('LanguageClientRegistry', () => {
	it('sends refresh request for a registered client', async () => {
		const registry = new LanguageClientRegistry();
		const sendRequest = vi.fn(async () => true);
		registry.register('turtle', { sendRequest } as any);

		await expect(registry.requestContextRefresh('turtle', 'file:///test.ttl')).resolves.toBe(true);
		expect(sendRequest).toHaveBeenCalledWith('mentor.request.refreshDocument', { uri: 'file:///test.ttl' });
	});

	it('returns false when client is not registered', async () => {
		const registry = new LanguageClientRegistry();

		await expect(registry.requestContextRefresh('turtle', 'file:///missing.ttl')).resolves.toBe(false);
	});

	it('returns false when client request throws', async () => {
		const registry = new LanguageClientRegistry();
		const sendRequest = vi.fn(async () => {
			throw new Error('fail');
		});
		registry.register('turtle', { sendRequest } as any);

		await expect(registry.requestContextRefresh('turtle', 'file:///test.ttl')).resolves.toBe(false);
	});

	it('unregister removes the client', async () => {
		const registry = new LanguageClientRegistry();
		const sendRequest = vi.fn(async () => true);
		registry.register('turtle', { sendRequest } as any);
		registry.unregister('turtle');

		await expect(registry.requestContextRefresh('turtle', 'file:///test.ttl')).resolves.toBe(false);
		expect(sendRequest).not.toHaveBeenCalled();
	});
});
