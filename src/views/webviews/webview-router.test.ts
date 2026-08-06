import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockSettingsController } = vi.hoisted(() => ({
	mockSettingsController: {
		openSection: vi.fn(),
	},
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SettingsPanelController') return mockSettingsController;
			return {};
		}),
	},
}));

import * as vscode from 'vscode';
import { WebviewRouter } from './webview-router';

beforeEach(() => {
	vi.clearAllMocks();
	mockSettingsController.openSection.mockResolvedValue(undefined);
});

describe('WebviewRouter', () => {
	it('routes a settings target to SettingsPanelController.openSection with section and view column', async () => {
		const router = new WebviewRouter();

		await router.open({ kind: 'settings', section: 'query.connections' }, vscode.ViewColumn.Active);

		expect(mockSettingsController.openSection).toHaveBeenCalledWith('query.connections', undefined, vscode.ViewColumn.Active);
	});

	it('forwards a connection param to SettingsPanelController.openSection', async () => {
		const router = new WebviewRouter();
		const connection = { id: 'conn-1', endpointUrl: 'http://example.org' } as any;

		await router.open({ kind: 'settings', section: 'query.connections', params: { connection } });

		expect(mockSettingsController.openSection).toHaveBeenCalledWith('query.connections', { connection }, undefined);
	});
});
