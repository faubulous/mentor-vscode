import * as vscode from 'vscode';
import { getConfig } from '@src/utilities/vscode/config';
import { ISettingsMigration } from '@src/services/core/settings-migration.interface';
import { requiresWorkspaceScope } from '../shacl-validation-configuration';

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
 * Moves *workspace-bound* SHACL validation profiles out of the user (global)
 * scope and drops the removed `shapeVersions` field from stored profiles.
 *
 * A profile that references `workspace:///` shape URIs only ever made sense for
 * the workspace it was created in and silently misbehaves in every other one —
 * such profiles are merged into the workspace value (an existing workspace
 * profile wins on an id collision, matching the runtime merge precedence).
 * Portable profiles — those referencing only bundled graphs and `user:///`
 * shapes — legitimately live in the user scope and are left there. Without an
 * open workspace folder the global value is left in place, minus the pruned
 * fields.
 *
 * Runs after {@link ShaclValidationProfilesMigration}, so only the
 * profile-based model needs to be handled here.
 *
 * Idempotent: does nothing when no workspace-bound global profiles and no
 * `shapeVersions` fields remain.
 */
export class ShaclValidationScopeMigration implements ISettingsMigration {
	readonly id = 'shacl.validation.workspace-scope';

	readonly description = 'Move workspace-bound SHACL validation profiles into workspace settings and drop the removed shapeVersions field.';

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

		// Only profiles referencing workspace:/// shapes are bound to the workspace;
		// portable profiles (bundled graphs, user:/// shapes) stay in the user scope.
		const boundProfiles: Record<string, StoredProfile> = {};
		const portableProfiles: Record<string, StoredProfile> = {};

		for (const [id, profile] of Object.entries(globalProfiles)) {
			const shapes = Array.isArray(profile?.shapes) ? profile.shapes as string[] : undefined;

			if (requiresWorkspaceScope(shapes)) {
				boundProfiles[id] = profile;
			} else {
				portableProfiles[id] = profile;
			}
		}

		const moveGlobal = canWriteWorkspace && Object.keys(boundProfiles).length > 0;

		if (moveGlobal) {
			const workspaceSettings: StoredSettings = { ...(workspace.value ?? {}) };

			// An existing workspace profile wins on an id collision, matching the
			// runtime merge precedence of the profile settings service.
			workspaceSettings.profiles = {
				...boundProfiles,
				...(workspace.value?.profiles ?? {}),
			};

			const globalSettings: StoredSettings = { ...(global.value ?? {}) };

			if (Object.keys(portableProfiles).length > 0) {
				globalSettings.profiles = portableProfiles;
			} else {
				delete globalSettings.profiles;
			}

			await config.update(KEY, workspaceSettings, vscode.ConfigurationTarget.Workspace);
			await config.update(KEY, Object.keys(globalSettings).length > 0 ? globalSettings : undefined, vscode.ConfigurationTarget.Global);

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
