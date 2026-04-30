import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

let mockSettingsSet: ReturnType<typeof vi.fn>;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn(() => ({
			set: (...args: any[]) => mockSettingsSet(...args),
		})),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { groupDefinitionsBySource } from '@src/commands/group-definitions-by-source';
import { DefinitionTreeLayout } from '@src/services/core/settings-service';

beforeEach(() => {
	mockSettingsSet = vi.fn();
});

describe('groupDefinitionsBySource command', () => {
	it('should have correct id', () => {
		expect(groupDefinitionsBySource.id).toBe('mentor.command.groupDefinitionsBySource');
	});

	it('should set defaultLayout to BySource', () => {
		groupDefinitionsBySource.handler();
		expect(mockSettingsSet).toHaveBeenCalledWith('view.definitionTree.defaultLayout', DefinitionTreeLayout.BySource);
	});
});
