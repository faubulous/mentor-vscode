import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockGetQueryStateForDocument: Mock;
let mockRemoveQueryState: Mock;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlQueryService') {
				return {
					getQueryStateForDocument: (...args: any[]) => mockGetQueryStateForDocument(...args),
					removeQueryState: (...args: any[]) => mockRemoveQueryState(...args),
				};
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { removeFromQueryHistory } from './remove-from-query-history';

beforeEach(() => {
	mockGetQueryStateForDocument = vi.fn(() => undefined);
	mockRemoveQueryState = vi.fn();
});

describe('removeFromQueryHistory command', () => {
	it('should have correct id', () => {
		expect(removeFromQueryHistory.id).toBe('mentor.command.removeFromQueryHistory');
	});

	it('should not call removeQueryState when no query state found', async () => {
		mockGetQueryStateForDocument.mockReturnValue(undefined);
		await removeFromQueryHistory.handler('http://example.org/doc');
		expect(mockRemoveQueryState).not.toHaveBeenCalled();
	});

	it('should call removeQueryState when a matching query state is found', async () => {
		const fakeState = { id: 'state-1' };
		mockGetQueryStateForDocument.mockReturnValue(fakeState);
		await removeFromQueryHistory.handler('http://example.org/doc');
		expect(mockGetQueryStateForDocument).toHaveBeenCalledWith('http://example.org/doc');
		expect(mockRemoveQueryState).toHaveBeenCalledWith(fakeState);
	});
});
