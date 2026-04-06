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

import { showReferences } from './show-references';

beforeEach(() => {
	mockSettingsSet = vi.fn();
});

describe('showReferences command', () => {
	it('should have correct id', () => {
		expect(showReferences.id).toBe('mentor.command.showReferences');
	});

	it('should set view.showReferences to true', () => {
		showReferences.handler();
		expect(mockSettingsSet).toHaveBeenCalledWith('view.showReferences', true);
	});
});
