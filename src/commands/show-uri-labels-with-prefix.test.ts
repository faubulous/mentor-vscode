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

import { showUriLabelsWithPrefix } from './show-uri-labels-with-prefix';
import { TreeLabelStyle } from '@src/services/core/settings-service';

beforeEach(() => {
	mockSettingsSet = vi.fn();
});

describe('showUriLabelsWithPrefix command', () => {
	it('should have correct id', () => {
		expect(showUriLabelsWithPrefix.id).toBe('mentor.command.showUriLabelsWithPrefix');
	});

	it('should set labelStyle to UriLabelsWithPrefix', () => {
		showUriLabelsWithPrefix.handler();
		expect(mockSettingsSet).toHaveBeenCalledWith('view.definitionTree.labelStyle', TreeLabelStyle.UriLabelsWithPrefix);
	});
});
