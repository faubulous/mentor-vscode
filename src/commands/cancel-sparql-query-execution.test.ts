import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockCancelQuery: ReturnType<typeof vi.fn>;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlQueryService') {
				return { cancelQuery: (...args: any[]) => mockCancelQuery(...args) };
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { cancelSparqlQueryExecution } from '@src/commands/cancel-sparql-query-execution';

beforeEach(() => {
	mockCancelQuery = vi.fn();
});

describe('cancelSparqlQueryExecution command', () => {
	it('should have correct id', () => {
		expect(cancelSparqlQueryExecution.id).toBe('mentor.command.cancelSparqlQueryExecution');
	});

	it('should call cancelQuery with the provided queryStateID', () => {
		cancelSparqlQueryExecution.handler('query-123');
		expect(mockCancelQuery).toHaveBeenCalledWith('query-123');
	});
});
