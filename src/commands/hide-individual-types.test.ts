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

import { hideIndividualTypes } from '@src/commands/hide-individual-types';

beforeEach(() => {
	mockSettingsSet = vi.fn();
});

describe('hideIndividualTypes command', () => {
	it('should have correct id', () => {
		expect(hideIndividualTypes.id).toBe('mentor.command.hideIndividualTypes');
	});

	it('should set view.showIndividualTypes to false', () => {
		hideIndividualTypes.handler();
		expect(mockSettingsSet).toHaveBeenCalledWith('view.showIndividualTypes', false);
	});
});
