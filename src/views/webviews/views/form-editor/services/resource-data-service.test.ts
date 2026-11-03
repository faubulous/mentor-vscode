import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NamedNode } from '@rdfjs/types';
import { ResourceDetail } from '../form-editor-model';
import { ResourceDataService } from './resource-data-service';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

/**
 * Create a resource of the example namespace.
 */
function resource(localName: string): NamedNode {
	return RdfDataFactory.namedNode(`http://example.org/${localName}`);
}

/**
 * Create a resource detail with no properties.
 */
function detail(localName: string): ResourceDetail {
	return { term: resource(localName), properties: [] };
}

/**
 * Create a service at document version 1, recording what it sends.
 */
function createService(): { service: ResourceDataService; send: ReturnType<typeof vi.fn> } {
	const send = vi.fn();
	const service = new ResourceDataService(send);

	service.setSnapshot(1, 1);

	return { service, send };
}

describe('ResourceDataService', () => {
	beforeEach(() => {
		vi.stubGlobal('requestAnimationFrame', undefined);
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('coalesces concurrent requests into one message', () => {
		const { service, send } = createService();

		service.request([resource('a')]);
		service.request([resource('b')]);
		service.request([resource('c')]);
		vi.runAllTimers();

		expect(send).toHaveBeenCalledTimes(1);
		expect(send.mock.calls[0][0]).toEqual([resource('a'), resource('b'), resource('c')]);
	});

	it('does not request the same resource twice', () => {
		const { service, send } = createService();

		service.request([resource('a')]);
		vi.runAllTimers();
		service.request([resource('a')]);
		vi.runAllTimers();

		expect(send).toHaveBeenCalledTimes(1);
	});

	it('serves accepted detail and notifies subscribers', () => {
		const { service } = createService();
		const listener = vi.fn();

		service.subscribe(listener);
		service.accept(1, [detail('a')]);

		expect(service.get(resource('a'))).toEqual(detail('a'));
		expect(listener).toHaveBeenCalled();
	});

	it('ignores detail delivered for a superseded version', () => {
		const { service } = createService();

		service.setSnapshot(2, 2);
		service.accept(1, [detail('a')]);

		expect(service.get(resource('a'))).toBeUndefined();
	});

	it('loads the detail again for the same document version built anew, keeping it as stale meanwhile', () => {
		const { service } = createService();

		service.accept(1, [detail('a')]);
		service.setSnapshot(1, 2);

		expect(service.version).toBe(1);
		expect(service.get(resource('a'))).toBeUndefined();
		expect(service.getStale(resource('a'))).toEqual(detail('a'));

		service.accept(1, [detail('a')]);

		expect(service.get(resource('a'))).toBeUndefined();
	});

	it('keeps the detail of the previous version as stale until the new one arrives', () => {
		const { service } = createService();

		service.accept(1, [detail('a')]);
		service.setSnapshot(2, 2);

		expect(service.get(resource('a'))).toBeUndefined();
		expect(service.getStale(resource('a'))).toEqual(detail('a'));

		service.accept(2, [detail('a')]);

		expect(service.get(resource('a'))).toEqual(detail('a'));
		expect(service.getStale(resource('a'))).toBeUndefined();
	});

	it('allows a resource to be requested again after a version change', () => {
		const { service, send } = createService();

		service.request([resource('a')]);
		vi.runAllTimers();
		service.setSnapshot(2, 2);
		service.request([resource('a')]);
		vi.runAllTimers();

		expect(send).toHaveBeenCalledTimes(2);
	});

	it('stops tracking resources the host could not resolve', () => {
		const { service, send } = createService();

		service.request([resource('gone')]);
		vi.runAllTimers();
		service.accept(1, [], [resource('gone')]);
		service.request([resource('gone')]);
		vi.runAllTimers();

		expect(send).toHaveBeenCalledTimes(2);
	});

	it('splits a large request into batches', () => {
		const { service, send } = createService();

		service.request(Array.from({ length: 150 }, (_, index) => resource(`r${index}`)));
		vi.runAllTimers();

		expect(send).toHaveBeenCalledTimes(2);
		expect(send.mock.calls[0][0]).toHaveLength(100);
		expect(send.mock.calls[1][0]).toHaveLength(50);
	});

	it('removes subscribers', () => {
		const { service } = createService();
		const listener = vi.fn();
		const unsubscribe = service.subscribe(listener);

		unsubscribe();
		service.accept(1, [detail('a')]);

		expect(listener).not.toHaveBeenCalled();
	});
});
