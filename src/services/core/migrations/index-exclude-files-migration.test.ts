import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { IndexExcludeFilesMigration } from '@src/services/core/migrations/index-exclude-files-migration';

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: vi.fn(),
}));

/**
 * Builds a configuration double whose `inspect` returns the supplied per-scope
 * values and whose `update` records every call for assertions.
 */
function createConfig(inspectByKey: Record<string, any>) {
	const updates: { key: string; value: any; target: number }[] = [];

	const config = {
		inspect: vi.fn((key: string) => inspectByKey[key]),
		update: vi.fn(async (key: string, value: any, target: number) => {
			updates.push({ key, value, target });
		}),
	};

	return { config, updates };
}

describe('IndexExcludeFilesMigration', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
	});

	test('migrates global ignoreFolders into excludeFiles and clears the old key', async () => {
		const { config, updates } = createConfig({
			'index.ignoreFolders': { globalValue: ['build', 'dist'] },
			'index.excludeFiles': {},
		});

		const { getConfig } = await import('@src/utilities/vscode/config');
		(getConfig as any).mockReturnValue(config);

		await new IndexExcludeFilesMigration().migrate();

		const setExclude = updates.find(u => u.key === 'index.excludeFiles' && u.target === vscode.ConfigurationTarget.Global);
		expect(setExclude?.value).toEqual(['build', 'dist']);

		const clearOld = updates.find(u => u.key === 'index.ignoreFolders' && u.target === vscode.ConfigurationTarget.Global);
		expect(clearOld?.value).toBeUndefined();
	});

	test('merges into existing excludeFiles without duplicates', async () => {
		const { config, updates } = createConfig({
			'index.ignoreFolders': { workspaceValue: ['build', 'node_modules'] },
			'index.excludeFiles': { workspaceValue: ['node_modules', 'out'] },
		});

		const { getConfig } = await import('@src/utilities/vscode/config');
		(getConfig as any).mockReturnValue(config);

		await new IndexExcludeFilesMigration().migrate();

		const setExclude = updates.find(u => u.key === 'index.excludeFiles' && u.target === vscode.ConfigurationTarget.Workspace);
		expect(setExclude?.value).toEqual(['node_modules', 'out', 'build']);
	});

	test('is a no-op when the old key is not set in any scope', async () => {
		const { config, updates } = createConfig({
			'index.ignoreFolders': {},
			'index.excludeFiles': { globalValue: ['x'] },
		});

		const { getConfig } = await import('@src/utilities/vscode/config');
		(getConfig as any).mockReturnValue(config);

		await new IndexExcludeFilesMigration().migrate();

		expect(updates).toHaveLength(0);
	});

	test('clears the old key even when it is an empty array (no excludeFiles write)', async () => {
		const { config, updates } = createConfig({
			'index.ignoreFolders': { globalValue: [] },
			'index.excludeFiles': {},
		});

		const { getConfig } = await import('@src/utilities/vscode/config');
		(getConfig as any).mockReturnValue(config);

		await new IndexExcludeFilesMigration().migrate();

		expect(updates.some(u => u.key === 'index.excludeFiles')).toBe(false);
		expect(updates.some(u => u.key === 'index.ignoreFolders' && u.value === undefined)).toBe(true);
	});
});
