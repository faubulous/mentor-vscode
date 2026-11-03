// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ResourceDetail } from '../form-editor-model';
import { ResourceDataService } from '../services/resource-data-service';
import { useResourceDetail } from './use-resource-detail';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

/**
 * Create a resource detail with no properties.
 */
function detail(localName: string): ResourceDetail {
	return { term: RdfDataFactory.namedNode(`http://example.org/${localName}`), properties: [] };
}

describe('useResourceDetail', () => {
	it('re-renders when the detail arrives and marks the previous version as stale while the next loads', () => {
		const service = new ResourceDataService(() => { });

		service.setSnapshot(1, 1);

		const { result } = renderHook(() => useResourceDetail(service, detail('a').term));

		expect(result.current).toEqual({ detail: undefined, stale: true });

		act(() => service.accept(1, [detail('a')]));

		expect(result.current).toEqual({ detail: detail('a'), stale: false });

		act(() => service.setSnapshot(2, 2));

		expect(result.current).toEqual({ detail: detail('a'), stale: true });
	});
});
