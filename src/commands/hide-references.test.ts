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

import { hideReferences } from './hide-references';

beforeEach(() => {
	mockSettingsSet = vi.fn();
});

describe('hideReferences command', () => {
	it('should have correct id', () => {
		expect(hideReferences.id).toBe('mentor.command.hideReferences');
	});

	it('should set view.showReferences to false', () => {
		hideReferences.handler();
		expect(mockSettingsSet).toHaveBeenCalledWith('view.showReferences', false);
	});
});
