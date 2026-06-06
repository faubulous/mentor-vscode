import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockRouter } = vi.hoisted(() => ({
	mockRouter: {
		open: vi.fn(),
	},
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'WebviewRouter') return mockRouter;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { openSettings } from '@src/commands/open-settings';

beforeEach(() => {
	vi.clearAllMocks();
	mockRouter.open.mockResolvedValue(undefined);
});

describe('openSettings command', () => {
	it('should have the correct id', () => {
		expect(openSettings.id).toBe('mentor.command.openSettings');
	});

	it('should route to the settings panel via ViewRouter', async () => {
		await openSettings.handler();
		expect(mockRouter.open).toHaveBeenCalledWith({ kind: 'settings' });
	});
});
