import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { ShaclValidationScopeMigration } from '@src/services/validation/migrations/shacl-validation-scope-migration';

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

async function migrate(inspectValue: any) {
	const { config, updates } = createConfig(inspectValue);

	const { getConfig } = await import('@src/utilities/vscode/config');
	(getConfig as any).mockReturnValue(config);

	await new ShaclValidationScopeMigration().migrate();

	return updates;
}

describe('ShaclValidationScopeMigration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.parse('file:///w'), name: 'w', index: 0 }];
	});

	test('moves workspace-bound global profiles into the workspace and clears the global value', async () => {
		const updates = await migrate({
			globalValue: { profiles: { 'a': { name: 'A', shapes: ['workspace:///a.ttl'] } } },
		});

		const write = updates.find(u => u.target === vscode.ConfigurationTarget.Workspace);
		expect(write?.value).toEqual({ profiles: { 'a': { name: 'A', shapes: ['workspace:///a.ttl'] } } });

		const clearGlobal = updates.find(u => u.target === vscode.ConfigurationTarget.Global);
		expect(clearGlobal?.value).toBeUndefined();
	});

	test('portable global profiles stay in the user scope', async () => {
		// The regression user-scope profiles depend on: profiles referencing only
		// bundled graphs or user shapes must never be moved to the workspace.
		const updates = await migrate({
			globalValue: {
				profiles: {
					'preset': { name: 'Preset', shapes: ['https://w3id.org/mentor/shacl/profiles/ontology'] },
					'user': { name: 'User', shapes: ['user:///shapes/my-shapes.ttl'] },
					'empty': { name: 'Empty' },
				},
			},
		});

		expect(updates).toHaveLength(0);
	});

	test('splits mixed global profiles: bound ones move, portable ones stay', async () => {
		const updates = await migrate({
			globalValue: {
				profiles: {
					'bound': { name: 'Bound', shapes: ['workspace:///a.ttl', 'user:///shapes/x.ttl'] },
					'portable': { name: 'Portable', shapes: ['user:///shapes/x.ttl'] },
				},
			},
		});

		const write = updates.find(u => u.target === vscode.ConfigurationTarget.Workspace);
		expect(write?.value).toEqual({ profiles: { 'bound': { name: 'Bound', shapes: ['workspace:///a.ttl', 'user:///shapes/x.ttl'] } } });

		const global = updates.find(u => u.target === vscode.ConfigurationTarget.Global);
		expect(global?.value).toEqual({ profiles: { 'portable': { name: 'Portable', shapes: ['user:///shapes/x.ttl'] } } });
	});

	test('an existing workspace profile wins on an id collision', async () => {
		const updates = await migrate({
			globalValue: {
				profiles: {
					'a': { name: 'User A', shapes: ['workspace:///a.ttl'] },
					'b': { name: 'User B', shapes: ['workspace:///b.ttl'] },
				},
			},
			workspaceValue: { profiles: { 'a': { name: 'Workspace A' } } },
		});

		const write = updates.find(u => u.target === vscode.ConfigurationTarget.Workspace);
		expect(write?.value).toEqual({
			profiles: {
				'a': { name: 'Workspace A' },
				'b': { name: 'User B', shapes: ['workspace:///b.ttl'] },
			},
		});
	});

	test('drops the removed shapeVersions field from moved profiles', async () => {
		const updates = await migrate({
			globalValue: {
				profiles: { 'a': { name: 'A', shapes: ['workspace:///a.ttl'], shapeVersions: { 'urn:x': '1.0' } } },
			},
		});

		const write = updates.find(u => u.target === vscode.ConfigurationTarget.Workspace);
		expect(write?.value).toEqual({ profiles: { 'a': { name: 'A', shapes: ['workspace:///a.ttl'] } } });
	});

	test('prunes shapeVersions from portable global profiles in place', async () => {
		const updates = await migrate({
			globalValue: {
				profiles: { 'a': { name: 'A', shapes: ['user:///shapes/x.ttl'], shapeVersions: { 'urn:x': '1.0' } } },
			},
		});

		expect(updates).toHaveLength(1);
		expect(updates[0]).toMatchObject({
			target: vscode.ConfigurationTarget.Global,
			value: { profiles: { 'a': { name: 'A', shapes: ['user:///shapes/x.ttl'] } } },
		});
	});

	test('prunes shapeVersions from workspace profiles in place', async () => {
		const updates = await migrate({
			workspaceValue: {
				profiles: { 'a': { name: 'A', shapeVersions: { 'urn:x': '1.0' } }, 'b': { name: 'B' } },
			},
		});

		expect(updates).toHaveLength(1);
		expect(updates[0]).toMatchObject({
			target: vscode.ConfigurationTarget.Workspace,
			value: { profiles: { 'a': { name: 'A' }, 'b': { name: 'B' } } },
		});
	});

	test('leaves a pruned global value in place when no workspace folder is open', async () => {
		(vscode.workspace as any).workspaceFolders = undefined;

		const updates = await migrate({
			globalValue: { profiles: { 'a': { name: 'A', shapeVersions: { 'urn:x': '1.0' } } } },
		});

		expect(updates).toHaveLength(1);
		expect(updates[0]).toMatchObject({
			target: vscode.ConfigurationTarget.Global,
			value: { profiles: { 'a': { name: 'A' } } },
		});
	});

	test('is a no-op when profiles are already workspace-only and clean', async () => {
		const updates = await migrate({
			workspaceValue: { profiles: { 'a': { name: 'A' } } },
		});

		expect(updates).toHaveLength(0);
	});

	test('is a no-op when nothing is stored', async () => {
		const updates = await migrate({});

		expect(updates).toHaveLength(0);
	});
});
