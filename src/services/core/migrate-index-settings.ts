import * as vscode from 'vscode';
import { getConfig } from '@src/utilities/vscode/config';

const OLD_KEY = 'index.ignoreFolders';
const NEW_KEY = 'index.excludeFiles';

/**
 * The configuration scopes to migrate, paired with the property on
 * {@link vscode.WorkspaceConfiguration.inspect} that exposes their per-scope value.
 */
const SCOPES: ReadonlyArray<{
	target: vscode.ConfigurationTarget;
	oldOf: (i: ReturnType<vscode.WorkspaceConfiguration['inspect']>) => string[] | undefined;
	newOf: (i: ReturnType<vscode.WorkspaceConfiguration['inspect']>) => string[] | undefined;
}> = [
	{
		target: vscode.ConfigurationTarget.Global,
		oldOf: i => i?.globalValue as string[] | undefined,
		newOf: i => i?.globalValue as string[] | undefined,
	},
	{
		target: vscode.ConfigurationTarget.Workspace,
		oldOf: i => i?.workspaceValue as string[] | undefined,
		newOf: i => i?.workspaceValue as string[] | undefined,
	},
	{
		target: vscode.ConfigurationTarget.WorkspaceFolder,
		oldOf: i => i?.workspaceFolderValue as string[] | undefined,
		newOf: i => i?.workspaceFolderValue as string[] | undefined,
	},
];

/**
 * Migrates the deprecated `mentor.index.ignoreFolders` setting to the new
 * glob-based `mentor.index.excludeFiles` setting.
 *
 * For each configuration scope that still defines the old key, its values are
 * merged into the new key (union, order-preserving) and the old key is cleared.
 * The routine is idempotent: scopes without the old key are left untouched, so
 * running it on every activation is safe.
 */
export async function migrateIndexSettings(): Promise<void> {
	const config = getConfig();

	const oldInspect = config.inspect<string[]>(OLD_KEY);
	const newInspect = config.inspect<string[]>(NEW_KEY);

	if (!oldInspect) {
		return;
	}

	for (const scope of SCOPES) {
		const oldValue = scope.oldOf(oldInspect);

		// Nothing to migrate for this scope.
		if (oldValue === undefined) {
			continue;
		}

		const existing = scope.newOf(newInspect) ?? [];
		const merged = [...existing];

		for (const pattern of oldValue) {
			if (!merged.includes(pattern)) {
				merged.push(pattern);
			}
		}

		// Only write the new key if there is anything to carry over.
		if (oldValue.length > 0) {
			await config.update(NEW_KEY, merged, scope.target);
		}

		// Remove the deprecated key from this scope.
		await config.update(OLD_KEY, undefined, scope.target);
	}
}
