import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ShaclValidationProfilesMigration } from '@src/services/validation/migrations/shacl-validation-profiles-migration';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: vi.fn(),
}));

const KEY = 'shacl.validation';

/**
 * Builds a configuration double whose `inspect` returns the supplied per-scope
 * values for the validation key and records every `update` call.
 */
function createConfig(inspectValue: any) {
	const updates: { key: string; value: any; target: number }[] = [];

	const config = {
		inspect: vi.fn((key: string) => (key === KEY ? inspectValue : undefined)),
		update: vi.fn(async (key: string, value: any, target: number) => {
			updates.push({ key, value, target });
		}),
	};

	return { config, updates };
}

describe('ShaclValidationProfilesMigration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.parse('file:///w'), name: 'w', index: 0 }];
	});

	test('migrates a legacy global value to workspace profiles and clears the global value', async () => {
		const { config, updates } = createConfig({
			globalValue: {
				defaults: ['workspace:///shapes/core.ttl'],
				graphs: {
					'workspace:///data.ttl': { includeDefaults: false, includeShapes: ['workspace:///shapes/extra.ttl'] },
				},
			},
		});

		const { getConfig } = await import('@src/utilities/vscode/config');
		(getConfig as any).mockReturnValue(config);

		await new ShaclValidationProfilesMigration().migrate();

		const write = updates.find(u => u.target === vscode.ConfigurationTarget.Workspace);
		expect(write?.value).toEqual({
			profiles: {
				'default': {
					name: 'Default',
					shapes: ['workspace:///shapes/core.ttl'],
					includeFiles: ['**/*'],
					excludeFiles: ['data.ttl'],
				},
				'data-ttl': {
					name: 'data.ttl',
					shapes: ['workspace:///shapes/extra.ttl'],
					includeFiles: ['data.ttl'],
				},
			},
		});

		const clearGlobal = updates.find(u => u.target === vscode.ConfigurationTarget.Global);
		expect(clearGlobal?.value).toBeUndefined();
	});

	test('is a no-op when the workspace value already uses the profile model', async () => {
		const { config, updates } = createConfig({
			workspaceValue: { profiles: { 'A': { shapes: [] } } },
		});

		const { getConfig } = await import('@src/utilities/vscode/config');
		(getConfig as any).mockReturnValue(config);

		await new ShaclValidationProfilesMigration().migrate();

		expect(updates).toHaveLength(0);
	});

	test('clears a leftover legacy global value once already migrated in the workspace', async () => {
		const { config, updates } = createConfig({
			workspaceValue: { profiles: {} },
			globalValue: { defaults: ['workspace:///old.ttl'] },
		});

		const { getConfig } = await import('@src/utilities/vscode/config');
		(getConfig as any).mockReturnValue(config);

		await new ShaclValidationProfilesMigration().migrate();

		expect(updates).toHaveLength(1);
		expect(updates[0]).toMatchObject({ target: vscode.ConfigurationTarget.Global, value: undefined });
	});

	test('does not migrate when no workspace folder is open', async () => {
		(vscode.workspace as any).workspaceFolders = undefined;

		const { config, updates } = createConfig({
			globalValue: { defaults: ['workspace:///core.ttl'] },
		});

		const { getConfig } = await import('@src/utilities/vscode/config');
		(getConfig as any).mockReturnValue(config);

		await new ShaclValidationProfilesMigration().migrate();

		expect(updates).toHaveLength(0);
	});
});
