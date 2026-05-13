import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockSettingsController, mockConnectionsListController } = vi.hoisted(() => ({
	mockSettingsController: {
		openSection: vi.fn(),
	},
	mockConnectionsListController: {
		open: vi.fn(),
	},
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SettingsPanelController') return mockSettingsController;
			if (token === 'SparqlConnectionsListController') return mockConnectionsListController;
			return {};
		}),
	},
}));

import * as vscode from 'vscode';
import { ViewRouter } from './view-router';

beforeEach(() => {
	vi.clearAllMocks();
	mockSettingsController.openSection.mockResolvedValue(undefined);
	mockConnectionsListController.open.mockResolvedValue(undefined);
});

describe('ViewRouter', () => {
	it('routes a settings target to SettingsPanelController.openSection with section and view column', async () => {
		const router = new ViewRouter();

		await router.open({ kind: 'settings', section: 'connections' }, vscode.ViewColumn.Active);

		expect(mockSettingsController.openSection).toHaveBeenCalledWith('connections', undefined, vscode.ViewColumn.Active);
	});

	it('forwards a connection param to SettingsPanelController.openSection', async () => {
		const router = new ViewRouter();
		const connection = { id: 'conn-1', endpointUrl: 'http://example.org' } as any;

		await router.open({ kind: 'settings', section: 'connections', params: { connection } });

		expect(mockSettingsController.openSection).toHaveBeenCalledWith('connections', { connection }, undefined);
	});

	it('routes a connectionsList target to SparqlConnectionsListController.open', async () => {
		const router = new ViewRouter();

		await router.open({ kind: 'connectionsList' });

		expect(mockConnectionsListController.open).toHaveBeenCalledTimes(1);
		expect(mockSettingsController.openSection).not.toHaveBeenCalled();
	});
});
