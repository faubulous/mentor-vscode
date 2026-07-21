import * as vscode from 'vscode';
import { getConfig } from '@src/utilities/vscode/config';
import { ISettingsMigration } from '@src/services/core/settings-migration.interface';

const KEY = 'shacl.validation';

/**
 * A stored profile as found in settings: the known fields plus any stale extra
 * keys (e.g. the removed `shapeVersions`) that hand-edited or outdated values
 * may still carry.
 */
type StoredProfile = Record<string, unknown>;

/**
 * The stored `mentor.shacl.validation` value in its post-legacy-migration shape.
 */
interface StoredSettings {
	profiles?: Record<string, StoredProfile>;
	[key: string]: unknown;
}

/**
 * Moves SHACL validation profiles out of the user (global) scope and drops the
 * removed `shapeVersions` field from stored profiles.
 *
 * Profiles are workspace-relative through and through — their `shapes` are
 * `workspace:///` URIs and their include/exclude entries are workspace-relative
 * paths — so a user-scope profile only ever made sense for the workspace it was
 * created in and silently misbehaves in every other one. Profiles are therefore
 * workspace-scope only: any global profiles are merged into the workspace value
 * (an existing workspace profile wins on an id collision, matching the runtime
 * merge precedence) and the global value is cleared. Without an open workspace
 * folder the global value is left in place, minus the pruned fields.
 *
 * Runs after {@link ShaclValidationProfilesMigration}, so only the
 * profile-based model needs to be handled here.
 *
 * Idempotent: does nothing when no global profiles and no `shapeVersions`
 * fields remain.
 */
export class ShaclValidationScopeMigration implements ISettingsMigration {
	readonly id = 'shacl.validation.workspace-scope';

	readonly description = 'Move SHACL validation profiles into workspace settings and drop the removed shapeVersions field.';

	async migrate(): Promise<void> {
		const config = getConfig();
		const info = config.inspect<StoredSettings>(KEY);

		if (!info) {
			return;
		}

		const global = this._pruneShapeVersions(info.globalValue);
		const workspace = this._pruneShapeVersions(info.workspaceValue);
		const canWriteWorkspace = !!vscode.workspace.workspaceFolders?.length;

		const globalProfiles = global.value?.profiles ?? {};
		const moveGlobal = canWriteWorkspace && Object.keys(globalProfiles).length > 0;

		if (moveGlobal) {
			const workspaceSettings: StoredSettings = { ...(workspace.value ?? {}) };

			// An existing workspace profile wins on an id collision, matching the
			// runtime merge precedence of the profile settings service.
			workspaceSettings.profiles = {
				...globalProfiles,
				...(workspace.value?.profiles ?? {}),
			};

			await config.update(KEY, workspaceSettings, vscode.ConfigurationTarget.Workspace);
			await config.update(KEY, undefined, vscode.ConfigurationTarget.Global);

			return;
		}

		if (workspace.changed) {
			await config.update(KEY, workspace.value, vscode.ConfigurationTarget.Workspace);
		}

		if (global.changed) {
			await config.update(KEY, global.value, vscode.ConfigurationTarget.Global);
		}
	}

	/**
	 * Returns a copy of the settings with the removed `shapeVersions` field
	 * stripped from every profile, and whether anything was actually stripped.
	 */
	private _pruneShapeVersions(settings: StoredSettings | undefined): { value: StoredSettings | undefined; changed: boolean } {
		if (!settings?.profiles) {
			return { value: settings, changed: false };
		}

		let changed = false;
		const profiles: Record<string, StoredProfile> = {};

		for (const [id, profile] of Object.entries(settings.profiles)) {
			if (profile && typeof profile === 'object' && 'shapeVersions' in profile) {
				const { shapeVersions: _dropped, ...rest } = profile;

				profiles[id] = rest;
				changed = true;
			} else {
				profiles[id] = profile;
			}
		}

		return changed ? { value: { ...settings, profiles }, changed } : { value: settings, changed };
	}
}
