// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ResourceCardBodyData } from '../form-editor-model';
import { ResourceDataService } from '../services/resource-data-service';
import { useResourceCardBody } from './use-resource-card-body';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

/**
 * Create the card body of a resource, without predicates.
 */
function cardBodyOf(localName: string): ResourceCardBodyData {
	return { subject: RdfDataFactory.namedNode(`http://example.org/${localName}`), predicates: [] };
}

describe('useResourceCardBody', () => {
	it('re-renders when the card body arrives and marks the previous version as stale while the next loads', () => {
		const service = new ResourceDataService(() => { });

		service.setSnapshot(1, 1);

		const { result } = renderHook(() => useResourceCardBody(service, cardBodyOf('a').subject));

		expect(result.current).toEqual({ cardBody: undefined, stale: true });

		act(() => service.accept(1, [cardBodyOf('a')]));

		expect(result.current).toEqual({ cardBody: cardBodyOf('a'), stale: false });

		act(() => service.setSnapshot(2, 2));

		expect(result.current).toEqual({ cardBody: cardBodyOf('a'), stale: true });
	});
});
