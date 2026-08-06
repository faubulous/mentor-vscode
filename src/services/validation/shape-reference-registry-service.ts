import * as vscode from 'vscode';
import { SettingsFileStore, WorkspaceReference } from '@src/services/core';
import { UserUri } from '@src/providers/user-uri';
import { WorkspaceIdentity, workspaceIdentity } from '@src/utilities/vscode/workspace';
import { ShaclProfileSettingsService } from './shacl-profile-settings-service';
import { getAllReferencedShapeUris } from './shacl-validation-configuration';

/**
 * Keeps the cross-workspace reference registry of user shape files up to date.
 *
 * `mentor.shacl.validation` profiles carry no workspace identity, so a user shape
 * referenced only by *another* workspace's workspace-scoped profile is invisible
 * to that other workspace's orphan detection and could be deleted by accident.
 * This service records, in the synced `mentor.files` entry, the workspaces whose
 * workspace-scoped profiles reference each file, keyed by a stable, rename-proof
 * workspace id, so the shape is protected everywhere (see
 * {@link ShapeGraphService.getUnreferencedUserShapeFiles}).
 *
 * User-scope profiles are global and already visible everywhere, so they are not
 * recorded here — only the current workspace's workspace-scoped references are.
 */
export class ShapeReferenceRegistryService implements vscode.Disposable {
	private readonly _disposables: vscode.Disposable[] = [];

	constructor(
		private readonly _fileStore: SettingsFileStore,
		private readonly _profileSettings: ShaclProfileSettingsService,
		private readonly _workspace: WorkspaceIdentity = workspaceIdentity
	) {
		// A profile save writes mentor.shacl.validation, so this keeps the current
		// workspace's contribution to the registry accurate as profiles change.
		this._disposables.push(vscode.workspace.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('mentor.shacl.validation')) {
				void this.reconcile();
			}
		}));
	}

	dispose(): void {
		for (const disposable of this._disposables) {
			disposable.dispose();
		}
	}

	/**
	 * Reconciles this workspace's entry into (or out of) the `references` of every
	 * user shape file, based on which files its workspace-scoped profiles currently
	 * reference. Other workspaces' entries are left untouched. The stable workspace
	 * id is generated (and persisted) only when this workspace actually references
	 * a user shape, so workspaces that use none never get an id written. A no-op
	 * when there is nothing to record and no id exists yet.
	 */
	async reconcile(): Promise<void> {
		const referenced = new Set(getAllReferencedShapeUris(this._profileSettings.getSettings('workspace')));
		const keys = this._fileStore.keys();
		const referencesAny = keys.some(key => referenced.has(UserUri.forPath(key)));

		let id = this._workspace.getId();

		if (!id) {
			// No id yet: only worth generating one if this workspace references a
			// shape. If it references none, there is nothing to add or remove.
			if (!referencesAny) {
				return;
			}

			id = await this._workspace.ensureId();

			if (!id) {
				return;
			}
		}

		const name = this._workspace.getName() ?? id;
		const updates: Record<string, WorkspaceReference[]> = {};

		for (const key of keys) {
			const isReferenced = referenced.has(UserUri.forPath(key));
			const current = this._fileStore.getReferences(key);
			const index = current.findIndex(ref => ref.id === id);

			if (isReferenced) {
				if (index === -1) {
					updates[key] = [...current, { id, name }].sort((a, b) => a.id.localeCompare(b.id));
				} else if (current[index].name !== name) {
					// Keep the id stable, refresh the display name (e.g. after a rename).
					updates[key] = current.map(ref => ref.id === id ? { id, name } : ref);
				}
			} else if (index !== -1) {
				updates[key] = current.filter(ref => ref.id !== id);
			}
		}

		if (Object.keys(updates).length > 0) {
			await this._fileStore.setReferences(updates);
		}
	}
}
