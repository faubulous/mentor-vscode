import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResourceDetail } from '../form-editor-model';
import { MessagingDataProvider } from './messaging-data-provider';

/**
 * Create a resource detail with no properties.
 */
function detail(id: string): ResourceDetail {
	return { id, term: { kind: 'iri', iri: `http://example.org/${id}` }, properties: [] };
}

/**
 * Create a provider at document version 1, recording what it sends.
 */
function createProvider(): { provider: MessagingDataProvider; send: ReturnType<typeof vi.fn> } {
	const send = vi.fn();
	const provider = new MessagingDataProvider(send);

	provider.setVersion(1);

	return { provider, send };
}

describe('MessagingDataProvider', () => {
	beforeEach(() => {
		vi.stubGlobal('requestAnimationFrame', undefined);
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('coalesces concurrent requests into one message', () => {
		const { provider, send } = createProvider();

		provider.request(['a']);
		provider.request(['b']);
		provider.request(['c']);
		vi.runAllTimers();

		expect(send).toHaveBeenCalledTimes(1);
		expect([...send.mock.calls[0][0]].sort()).toEqual(['a', 'b', 'c']);
	});

	it('does not request the same resource twice', () => {
		const { provider, send } = createProvider();

		provider.request(['a']);
		vi.runAllTimers();
		provider.request(['a']);
		vi.runAllTimers();

		expect(send).toHaveBeenCalledTimes(1);
	});

	it('serves accepted detail and notifies subscribers', () => {
		const { provider } = createProvider();
		const listener = vi.fn();

		provider.subscribe(listener);
		provider.accept(1, [detail('a')]);

		expect(provider.get('a')).toEqual(detail('a'));
		expect(listener).toHaveBeenCalled();
	});

	it('ignores detail delivered for a superseded version', () => {
		const { provider } = createProvider();

		provider.setVersion(2);
		provider.accept(1, [detail('a')]);

		expect(provider.get('a')).toBeUndefined();
	});

	it('keeps the detail of the previous version as stale until the new one arrives', () => {
		const { provider } = createProvider();

		provider.accept(1, [detail('a')]);
		provider.setVersion(2);

		expect(provider.get('a')).toBeUndefined();
		expect(provider.getStale('a')).toEqual(detail('a'));

		provider.accept(2, [detail('a')]);

		expect(provider.get('a')).toEqual(detail('a'));
		expect(provider.getStale('a')).toBeUndefined();
	});

	it('allows a resource to be requested again after a version change', () => {
		const { provider, send } = createProvider();

		provider.request(['a']);
		vi.runAllTimers();
		provider.setVersion(2);
		provider.request(['a']);
		vi.runAllTimers();

		expect(send).toHaveBeenCalledTimes(2);
	});

	it('stops tracking resources the host could not resolve', () => {
		const { provider, send } = createProvider();

		provider.request(['gone']);
		vi.runAllTimers();
		provider.accept(1, [], ['gone']);
		provider.request(['gone']);
		vi.runAllTimers();

		expect(send).toHaveBeenCalledTimes(2);
	});

	it('splits a large request into batches', () => {
		const { provider, send } = createProvider();

		provider.request(Array.from({ length: 150 }, (_, index) => `r${index}`));
		vi.runAllTimers();

		expect(send).toHaveBeenCalledTimes(2);
		expect(send.mock.calls[0][0]).toHaveLength(100);
		expect(send.mock.calls[1][0]).toHaveLength(50);
	});

	it('removes subscribers', () => {
		const { provider } = createProvider();
		const listener = vi.fn();
		const unsubscribe = provider.subscribe(listener);

		unsubscribe();
		provider.accept(1, [detail('a')]);

		expect(listener).not.toHaveBeenCalled();
	});
});
