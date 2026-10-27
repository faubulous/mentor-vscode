// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ResourceDetail } from '../form-editor-model';
import { ResourceDataService } from '../services/resource-data-service';
import { useResourceDetail } from './use-resource-detail';

/**
 * Create a resource detail with no properties.
 */
function detail(id: string): ResourceDetail {
	return { id, term: { kind: 'iri', iri: `http://example.org/${id}` }, properties: [] };
}

describe('useResourceDetail', () => {
	it('re-renders when the detail arrives and marks the previous version as stale while the next loads', () => {
		const service = new ResourceDataService(() => { });

		service.setVersion(1);

		const { result } = renderHook(() => useResourceDetail(service, 'a'));

		expect(result.current).toEqual({ detail: undefined, stale: true });

		act(() => service.accept(1, [detail('a')]));

		expect(result.current).toEqual({ detail: detail('a'), stale: false });

		act(() => service.setVersion(2));

		expect(result.current).toEqual({ detail: detail('a'), stale: true });
	});
});
