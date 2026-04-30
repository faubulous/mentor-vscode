import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockIndexWorkspace: ReturnType<typeof vi.fn>;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'WorkspaceIndexerService') {
				return { indexWorkspace: (...args: any[]) => mockIndexWorkspace(...args) };
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { analyzeWorkspace } from '@src/commands/analyze-workspace';

beforeEach(() => {
	mockIndexWorkspace = vi.fn();
});

describe('analyzeWorkspace command', () => {
	it('should have correct id', () => {
		expect(analyzeWorkspace.id).toBe('mentor.command.analyzeWorkspace');
	});

	it('should call indexWorkspace with force=true', () => {
		analyzeWorkspace.handler();
		expect(mockIndexWorkspace).toHaveBeenCalledWith(true);
	});
});
