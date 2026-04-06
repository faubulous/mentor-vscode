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

import { showPropertyTypes } from './show-property-types';

beforeEach(() => {
	mockSettingsSet = vi.fn();
});

describe('showPropertyTypes command', () => {
	it('should have correct id', () => {
		expect(showPropertyTypes.id).toBe('mentor.command.showPropertyTypes');
	});

	it('should set view.showPropertyTypes to true', () => {
		showPropertyTypes.handler();
		expect(mockSettingsSet).toHaveBeenCalledWith('view.showPropertyTypes', true);
	});
});
