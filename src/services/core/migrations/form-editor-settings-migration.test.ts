import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { FormEditorSettingsMigration } from '@src/services/core/migrations/form-editor-settings-migration';

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: vi.fn(),
}));

/**
 * Run the migration over a configuration whose `inspect` returns the given values per key, and
 * record the updates it makes.
 * @param inspectByKey The values of each key per scope.
 * @returns The updates.
 */
async function migrate(inspectByKey: Record<string, unknown>): Promise<{ key: string; value: unknown; target: number }[]> {
	const updates: { key: string; value: unknown; target: number }[] = [];
	const config = {
		inspect: vi.fn((key: string) => inspectByKey[key]),
		update: vi.fn(async (key: string, value: unknown, target: number) => {
			updates.push({ key, value, target });
		}),
	};
	const { getConfig } = await import('@src/utilities/vscode/config');

	(getConfig as ReturnType<typeof vi.fn>).mockReturnValue(config);

	await new FormEditorSettingsMigration().migrate();

	return updates;
}

describe('FormEditorSettingsMigration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('removes the removed settings from each scope they are written in', async () => {
		const updates = await migrate({
			'formEditor.enabled': { globalValue: true, workspaceValue: false },
			'formEditor.defaultView': { globalValue: 'form' },
			'formEditor.logPerformance': { workspaceFolderValue: true },
		});

		expect(updates).toEqual([
			{ key: 'formEditor.enabled', value: undefined, target: vscode.ConfigurationTarget.Global },
			{ key: 'formEditor.enabled', value: undefined, target: vscode.ConfigurationTarget.Workspace },
			{ key: 'formEditor.defaultView', value: undefined, target: vscode.ConfigurationTarget.Global },
			{ key: 'formEditor.logPerformance', value: undefined, target: vscode.ConfigurationTarget.WorkspaceFolder },
		]);
	});

	test('writes nothing where none of them is set', async () => {
		expect(await migrate({ 'formEditor.enabled': {} })).toEqual([]);
	});
});
