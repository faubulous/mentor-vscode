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

import { showAnnotatedLabels } from './show-annotated-labels';
import { TreeLabelStyle } from '@src/services/core/settings-service';

beforeEach(() => {
	mockSettingsSet = vi.fn();
});

describe('showAnnotatedLabels command', () => {
	it('should have correct id', () => {
		expect(showAnnotatedLabels.id).toBe('mentor.command.showAnnotatedLabels');
	});

	it('should set labelStyle to AnnotatedLabels', () => {
		showAnnotatedLabels.handler();
		expect(mockSettingsSet).toHaveBeenCalledWith('view.definitionTree.labelStyle', TreeLabelStyle.AnnotatedLabels);
	});
});
