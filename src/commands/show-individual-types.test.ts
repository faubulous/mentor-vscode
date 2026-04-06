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

import { showIndividualTypes } from './show-individual-types';

beforeEach(() => {
	mockSettingsSet = vi.fn();
});

describe('showIndividualTypes command', () => {
	it('should have correct id', () => {
		expect(showIndividualTypes.id).toBe('mentor.command.showIndividualTypes');
	});

	it('should set view.showIndividualTypes to true', () => {
		showIndividualTypes.handler();
		expect(mockSettingsSet).toHaveBeenCalledWith('view.showIndividualTypes', true);
	});
});
