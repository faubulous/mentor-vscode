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

import { showUriLabels } from '@src/commands/show-uri-labels';
import { TreeLabelStyle } from '@src/services/core/settings-service';

beforeEach(() => {
	mockSettingsSet = vi.fn();
});

describe('showUriLabels command', () => {
	it('should have correct id', () => {
		expect(showUriLabels.id).toBe('mentor.command.showUriLabels');
	});

	it('should set labelStyle to UriLabels', () => {
		showUriLabels.handler();
		expect(mockSettingsSet).toHaveBeenCalledWith('view.definitionTree.labelStyle', TreeLabelStyle.UriLabels);
	});
});
