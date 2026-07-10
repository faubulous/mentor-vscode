import * as vscode from 'vscode';
import { ScopeKey } from '@src/utilities/config-scope';
import { toConfigurationTarget } from '@src/utilities/vscode/config';
import { ShaclValidationProfile, ShaclValidationSettings } from './shacl-validation-configuration';

/**
 * Reads and mutates the per-scope `mentor.shacl.validation` settings object on
 * the extension host. The host-side counterpart of the settings webview's
 * scoped commit: profiles can live in either the user or the workspace scope,
 * with the workspace definition shadowing a user definition of the same id in
 * the merged runtime view.
 */
export class ShaclProfileSettingsWriter {
	/**
	 * Inspects the raw per-scope values of the `mentor.shacl.validation` key.
	 */
	private _inspect() {
		return vscode.workspace.getConfiguration('mentor.shacl').inspect<ShaclValidationSettings>('validation');
	}

	/**
	 * Returns the settings object persisted at the given scope, or an empty
	 * object when the scope holds no value.
	 */
	getSettings(scope: ScopeKey): ShaclValidationSettings {
		const info = this._inspect();

		return (scope === 'workspace' ? info?.workspaceValue : info?.globalValue) ?? {};
	}

	/**
	 * Returns the profiles record persisted at the given scope.
	 */
	getProfiles(scope: ScopeKey): Record<string, ShaclValidationProfile> {
		return this.getSettings(scope).profiles ?? {};
	}

	/**
	 * Returns the scope a profile id is stored in. A workspace definition
	 * shadows a user definition of the same id in the merged view, so the
	 * workspace scope wins on a collision.
	 */
	getProfileScope(id: string): ScopeKey {
		return this.getProfiles('workspace')[id] ? 'workspace' : 'user';
	}

	/**
	 * Finds a profile by id across both scopes, workspace first (matching the
	 * runtime merge precedence). Returns undefined when the id is not stored in
	 * either scope.
	 */
	findProfile(id: string): { scope: ScopeKey; profile: ShaclValidationProfile } | undefined {
		for (const scope of ['workspace', 'user'] as ScopeKey[]) {
			const profile = this.getProfiles(scope)[id];

			if (profile) {
				return { scope, profile };
			}
		}

		return undefined;
	}

	/**
	 * Mutates one scope's profiles record and persists the result. Re-reads the
	 * settings right before writing to minimize clobbering concurrent edits from
	 * the settings webview. A record left empty by the mutation is removed from
	 * the persisted value entirely.
	 */
	async mutateProfiles(scope: ScopeKey, mutate: (profiles: Record<string, ShaclValidationProfile>) => void): Promise<void> {
		const current = this.getSettings(scope);
		const profiles = { ...(current.profiles ?? {}) };

		mutate(profiles);

		const next: ShaclValidationSettings = { ...current };

		if (Object.keys(profiles).length > 0) {
			next.profiles = profiles;
		} else {
			delete next.profiles;
		}

		await vscode.workspace.getConfiguration('mentor.shacl')
			.update('validation', next, toConfigurationTarget(scope));
	}
}
