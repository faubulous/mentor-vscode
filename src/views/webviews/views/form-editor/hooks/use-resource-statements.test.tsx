// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { ResourceStatements } from '../form-editor-model';
import { ResourceDataService } from '../services/resource-data-service';
import { useResourceStatements } from './use-resource-statements';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

/**
 * Create the statements about a resource, without properties.
 */
function statements(localName: string): ResourceStatements {
	return { subjectTerm: RdfDataFactory.namedNode(`http://example.org/${localName}`), properties: [] };
}

describe('useResourceStatements', () => {
	it('re-renders when the statements arrives and marks the previous version as stale while the next loads', () => {
		const service = new ResourceDataService(() => { });

		service.setSnapshot(1, 1);

		const { result } = renderHook(() => useResourceStatements(service, statements('a').subjectTerm));

		expect(result.current).toEqual({ statements: undefined, stale: true });

		act(() => service.accept(1, [statements('a')]));

		expect(result.current).toEqual({ statements: statements('a'), stale: false });

		act(() => service.setSnapshot(2, 2));

		expect(result.current).toEqual({ statements: statements('a'), stale: true });
	});
});
