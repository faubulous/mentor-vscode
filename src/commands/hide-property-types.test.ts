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

import { hidePropertyTypes } from './hide-property-types';

beforeEach(() => {
	mockSettingsSet = vi.fn();
});

describe('hidePropertyTypes command', () => {
	it('should have correct id', () => {
		expect(hidePropertyTypes.id).toBe('mentor.command.hidePropertyTypes');
	});

	it('should set view.showPropertyTypes to false', () => {
		hidePropertyTypes.handler();
		expect(mockSettingsSet).toHaveBeenCalledWith('view.showPropertyTypes', false);
	});
});
