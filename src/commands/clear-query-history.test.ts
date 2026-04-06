import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockClearQueryHistory: ReturnType<typeof vi.fn>;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlQueryService') {
				return { clearQueryHistory: (...args: any[]) => mockClearQueryHistory(...args) };
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { clearQueryHistory } from './clear-query-history';

beforeEach(() => {
	mockClearQueryHistory = vi.fn();
});

describe('clearQueryHistory command', () => {
	it('should have correct id', () => {
		expect(clearQueryHistory.id).toBe('mentor.command.clearQueryHistory');
	});

	it('should call clearQueryHistory on the query service', async () => {
		await clearQueryHistory.handler();
		expect(mockClearQueryHistory).toHaveBeenCalled();
	});
});
