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

import { groupDefinitionsByType } from '@src/commands/group-definitions-by-type';
import { DefinitionTreeLayout } from '@src/services/core/settings-service';

beforeEach(() => {
	mockSettingsSet = vi.fn();
});

describe('groupDefinitionsByType command', () => {
	it('should have correct id', () => {
		expect(groupDefinitionsByType.id).toBe('mentor.command.groupDefinitionsByType');
	});

	it('should set defaultLayout to ByType', () => {
		groupDefinitionsByType.handler();
		expect(mockSettingsSet).toHaveBeenCalledWith('view.definitionTree.defaultLayout', DefinitionTreeLayout.ByType);
	});
});
