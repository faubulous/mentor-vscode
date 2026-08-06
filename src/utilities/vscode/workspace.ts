import * as vscode from 'vscode';
import { getConfig } from './config';

/**
 * A stable identity for the current workspace, used to record which workspaces
 * reference a user shape file (so the file is protected from deletion elsewhere).
 * The id is a Mentor-generated UUID persisted in the workspace settings, so it
 * survives folder/workspace renames and is unique; the name is only for display.
 */
export interface WorkspaceIdentity {
	/** Reads the persisted workspace id, or `undefined` when none is set yet. */
	getId(): string | undefined;
	/** Reads the persisted id, generating and persisting one when missing and a workspace is open. */
	ensureId(): Promise<string | undefined>;
	/** A human-readable workspace name for display (folder / .code-workspace name). */
	getName(): string | undefined;
}

/**
 * Reads the stable workspace id from `mentor.workspaceId` (workspace scope), or
 * `undefined` when it has not been generated yet.
 */
export function getWorkspaceId(): string | undefined {
	return getConfig().inspect<string>('workspaceId')?.workspaceValue;
}

/**
 * A human-readable name for the current workspace: the `.code-workspace` basename
 * (without extension) when a saved workspace file is open, else the first folder
 * name, else `undefined`. For display only — not stable across renames.
 */
export function getWorkspaceName(): string | undefined {
	const workspaceFile = vscode.workspace.workspaceFile;

	if (workspaceFile && workspaceFile.scheme !== 'untitled') {
		const parts = workspaceFile.path.split('/');

		return parts[parts.length - 1].replace(/\.code-workspace$/, '');
	}

	return vscode.workspace.workspaceFolders?.[0]?.name;
}

/**
 * Returns the stable workspace id, generating and persisting a UUID into the
 * workspace settings when none exists yet. Returns `undefined` when no workspace
 * or folder is open (nowhere to persist to) or the write fails.
 */
export async function ensureWorkspaceId(): Promise<string | undefined> {
	const existing = getWorkspaceId();

	if (existing) {
		return existing;
	}

	// A workspace-scope write needs an open workspace or folder as its target.
	if (!vscode.workspace.workspaceFile && !vscode.workspace.workspaceFolders?.length) {
		return undefined;
	}

	const id = crypto.randomUUID();

	try {
		await getConfig().update('workspaceId', id, vscode.ConfigurationTarget.Workspace);
	} catch {
		return undefined;
	}

	return id;
}

/**
 * The default workspace identity, backed by the workspace settings.
 */
export const workspaceIdentity: WorkspaceIdentity = {
	getId: getWorkspaceId,
	ensureId: ensureWorkspaceId,
	getName: getWorkspaceName,
};
