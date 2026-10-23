import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const { services } = vi.hoisted(() => ({
	services: {} as Record<string, any>,
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => services[token] ?? {}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { handleWorkspaceRenames } from '@src/services/core/workspace-rename-handler';

describe('handleWorkspaceRenames', () => {
	const renames = [{ oldUri: vscode.Uri.parse('file:///w/old'), newUri: vscode.Uri.parse('file:///w/new') }];
	const changes = new Map([['workspace:/old/a.ttl', 'workspace:/new/a.ttl']]);

	beforeEach(() => {
		services.ReferenceUpdateService = {
			buildChangesForRenames: vi.fn(() => changes),
			batchUpdate: vi.fn(async () => undefined),
		};
		services.DocumentConnectionService = {
			handleFileRenames: vi.fn(async () => undefined),
		};
		services.ShaclValidationService = {
			settingsSync: { migrateShaclSettings: vi.fn(async () => undefined) },
		};
	});

	it('computes the reference changes before awaiting the settings migrations', async () => {
		await handleWorkspaceRenames(renames);

		const buildOrder = services.ReferenceUpdateService.buildChangesForRenames.mock.invocationCallOrder[0];

		expect(buildOrder).toBeLessThan(services.DocumentConnectionService.handleFileRenames.mock.invocationCallOrder[0]);
		expect(buildOrder).toBeLessThan(services.ShaclValidationService.settingsSync.migrateShaclSettings.mock.invocationCallOrder[0]);
	});

	it('applies the computed reference changes after migrating the settings', async () => {
		await handleWorkspaceRenames(renames);

		expect(services.ReferenceUpdateService.buildChangesForRenames).toHaveBeenCalledWith(renames);
		expect(services.DocumentConnectionService.handleFileRenames).toHaveBeenCalledWith(renames);
		expect(services.ShaclValidationService.settingsSync.migrateShaclSettings).toHaveBeenCalledWith(renames);
		expect(services.ReferenceUpdateService.batchUpdate).toHaveBeenCalledExactlyOnceWith(changes);
	});
});
