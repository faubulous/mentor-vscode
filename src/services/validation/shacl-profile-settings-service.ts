import { ScopeKey } from '@src/utilities/config-scope';
import { getConfig, toConfigurationTarget } from '@src/utilities/vscode/config';
import { ShaclValidationProfile, ShaclValidationSettings } from './shacl-validation-configuration';

/**
 * The single owner of reading, merging and mutating the per-scope
 * `mentor.shacl.validation` settings object on the extension host. Profiles can
 * live in either the user or the workspace scope, with the workspace definition
 * shadowing a user definition of the same id in the merged runtime view —
 * mirroring how SPARQL stores and connections are resolved.
 */
export class ShaclProfileSettingsService {
	/**
	 * Inspects the raw per-scope values of the `mentor.shacl.validation` key.
	 */
	private _inspect() {
		return getConfig('shacl').inspect<ShaclValidationSettings>('validation');
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
	 * Returns the merged runtime view of the settings across the user and
	 * workspace scopes (workspace overrides user on a profile id conflict).
	 * Built-in presets are defined in code and instantiated into ordinary
	 * profiles, so the manifest default carries no profiles — only the two
	 * user-editable scopes contribute.
	 */
	getMergedSettings(): ShaclValidationSettings {
		const info = this._inspect();

		if (!info) {
			return getConfig('shacl').get<ShaclValidationSettings>('validation', {});
		}

		const scopes = [info.globalValue, info.workspaceValue];

		return {
			profiles: Object.assign({}, ...scopes.map(s => s?.profiles ?? {})),
		};
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
	 * Persists a settings object at the given scope.
	 */
	async writeSettings(scope: ScopeKey, settings: ShaclValidationSettings): Promise<void> {
		await getConfig('shacl').update('validation', settings, toConfigurationTarget(scope));
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

		await this.writeSettings(scope, next);
	}

	/**
	 * Applies an update to every scope that holds a stored settings value: the
	 * callback receives the scope's settings and returns the replacement, or
	 * `undefined` to leave that scope unchanged. Used by rename migration,
	 * delete pruning and shape-version reconciliation, which must cover profiles
	 * regardless of the scope they live in.
	 *
	 * Note that include/exclude entries are workspace-relative, so applying a
	 * rename or deletion to a user-scope profile is only meaningful for the
	 * workspace the event originated in; entries scoped to other workspaces
	 * never match the renamed paths and remain untouched.
	 */
	async updateEachScope(
		update: (settings: ShaclValidationSettings, scope: ScopeKey) => ShaclValidationSettings | undefined
	): Promise<void> {
		const info = this._inspect();

		if (!info) {
			return;
		}

		const scopes: [ScopeKey, ShaclValidationSettings | undefined][] = [
			['user', info.globalValue],
			['workspace', info.workspaceValue],
		];

		for (const [scope, value] of scopes) {
			if (value === undefined) {
				continue;
			}

			const next = update(value, scope);

			if (next !== undefined) {
				await this.writeSettings(scope, next);
			}
		}
	}
}
