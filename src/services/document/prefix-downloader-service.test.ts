import { describe, it, expect, vi, afterEach } from 'vitest';
import { PrefixDownloaderService } from '@src/services/document/prefix-downloader-service';

describe('PrefixDownloaderService', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('fetchPrefixes', () => {
		it('returns parsed prefixes from the endpoint', async () => {
			const mockPrefixes = { ex: 'http://example.org/', schema: 'http://schema.org/' };

			vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ '@context': mockPrefixes }),
			}));

			const service = new PrefixDownloaderService();
			const result = await service.fetchPrefixes();

			expect(result.prefixes).toEqual(mockPrefixes);
			expect(result.lastUpdated).toBeInstanceOf(Date);
		});

		it('fetches from the correct endpoint URL', async () => {
			const fetchSpy = vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ '@context': {} }),
			});

			vi.stubGlobal('fetch', fetchSpy);

			const service = new PrefixDownloaderService();
			await service.fetchPrefixes();

			expect(fetchSpy).toHaveBeenCalledWith(service.endpointUrl);
		});

		it('throws when the HTTP response is not ok', async () => {
			vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
				ok: false,
				statusText: 'Service Unavailable',
			}));

			const service = new PrefixDownloaderService();

			await expect(service.fetchPrefixes()).rejects.toThrow('Service Unavailable');
		});
	});
});
