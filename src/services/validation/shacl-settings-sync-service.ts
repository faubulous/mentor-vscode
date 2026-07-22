import * as vscode from 'vscode';
import { Store } from '@faubulous/mentor-rdf';
import { getConfig } from '@src/utilities/vscode/config';
import { toUniqueStringArray } from '@src/utilities/array';
import { getGlobPatternBase } from '@src/utilities/glob';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { UserUri } from '@src/providers/user-uri';
import { UserFileSystemProvider } from '@src/providers/user-file-system-provider';
import {
	findBrokenReferences,
	getAllReferencedShapeUris,
	migrateShaclValidationConfig,
	ShaclBrokenReferences,
	ShaclDocumentRename,
} from './shacl-validation-configuration';
import { ShaclProfileSettingsService } from './shacl-profile-settings-service';
import { USER_SHAPES_FOLDER } from './shape-graph-service';

/**
 * Keeps the `mentor.shacl.validation` settings in sync with the workspace:
 * follows file/folder renames and deletions in the profiles' shape references
 * and include/exclude entries, and runs the startup health check for broken
 * references.
 */
export class ShaclSettingsSyncService {
	/**
	 * Ensures the startup profile health check runs at most once per session.
	 */
	private _startupProfileCheckDone = false;

	constructor(
		private readonly _store: Store,
		private readonly _profileSettings: ShaclProfileSettingsService,
		private readonly _onHealthChecked?: (broken: ShaclBrokenReferences) => void
	) { }

	/**
	 * Checks all validation profiles for broken references: shape files that no
	 * longer exist. Every check also reports its outcome through the
	 * `onHealthChecked` callback, so the validation status bar item can surface
	 * (and clear) a configuration error.
	 */
	async checkShaclProfiles(): Promise<ShaclBrokenReferences> {
		const settings = this._profileSettings.getMergedSettings();
		const existing = new Set<string>();

		for (const uri of getAllReferencedShapeUris(settings)) {
			if (await this._shapeFileExists(uri)) {
				existing.add(uri);
			}
		}

		const broken = findBrokenReferences(settings, uri => existing.has(uri));

		this._onHealthChecked?.(broken);

		return broken;
	}

	/**
	 * Runs the startup health check once per session: if any profile references
	 * missing shape files, shows a warning with an action to open the validation
	 * settings.
	 */
	async runStartupProfileCheck(): Promise<void> {
		if (this._startupProfileCheckDone || !getConfig('shacl').get<boolean>('enabled', false)) {
			return;
		}

		this._startupProfileCheckDone = true;

		const broken = await this.checkShaclProfiles();
		const brokenProfiles = Object.keys(broken.profiles);

		if (brokenProfiles.length === 0) {
			return;
		}

		const action = await vscode.window.showWarningMessage(
			`Some SHACL validation profiles reference missing shape graphs. Affected profiles: ${brokenProfiles.join(', ')}`,
			'Manage Profiles'
		);

		if (action === 'Manage Profiles') {
			await vscode.commands.executeCommand('mentor.command.openSettings', 'validation.profiles');
		}
	}

	/**
	 * Migrates SHACL validation settings for renamed/moved files or folders.
	 *
	 * Shape entries in `mentor.shacl.validation` are canonical
	 * `workspace:///...` URIs while include/exclude entries are bare
	 * workspace-relative paths, so each rename carries both forms. Only renames
	 * for files whose old URI can be resolved to a workspace-relative URI are
	 * migrated. Profiles in both the user and the workspace scope are covered;
	 * user-scope entries belonging to other workspaces never match the renamed
	 * paths and stay untouched.
	 */
	async migrateShaclSettings(files: ReadonlyArray<{ oldUri: vscode.Uri; newUri: vscode.Uri }>): Promise<void> {
		const renames: ShaclDocumentRename[] = [];

		for (const { oldUri, newUri } of files) {
			const oldWorkspaceUri = WorkspaceUri.toWorkspaceUri(oldUri);

			if (!oldWorkspaceUri) {
				// File is outside the current workspace root — skip.
				continue;
			}

			const newWorkspaceUri = WorkspaceUri.toWorkspaceUri(newUri);

			renames.push({
				oldUri: WorkspaceUri.toCanonicalString(oldWorkspaceUri),
				newUri: newWorkspaceUri
					? WorkspaceUri.toCanonicalString(newWorkspaceUri)
					: newUri.toString(),
				oldPath: oldWorkspaceUri.relativePath,
				newPath: newWorkspaceUri
					? newWorkspaceUri.relativePath
					: newUri.toString(),
			});
		}

		if (renames.length === 0) {
			return;
		}

		await this._profileSettings.updateEachScope(current => {
			const migrated = migrateShaclValidationConfig(current, renames);

			// Only persist scopes the renames actually touched.
			return JSON.stringify(migrated) !== JSON.stringify(current) ? migrated : undefined;
		});
	}

	/**
	 * Handles file/folder deletions:
	 * - Prunes include/exclude entries whose literal path or fixed pattern prefix lies
	 *   inside a deleted path (they can never match anything again). Root-anchored
	 *   patterns are left untouched. Profiles in both the user and the workspace
	 *   scope are covered.
	 * - Warns — without modifying shape lists — when a deleted file is still
	 *   referenced as a shape file by a profile.
	 */
	async handleFileDeletes(files: ReadonlyArray<vscode.Uri>): Promise<void> {
		// Shape entries are canonical workspace:/// URIs, include/exclude entries are
		// bare relative paths — collect the deletions in both forms.
		const deletedUris: string[] = [];
		const deletedPaths: string[] = [];

		for (const uri of files) {
			const wsUri = WorkspaceUri.toWorkspaceUri(uri);

			if (wsUri) {
				deletedUris.push(WorkspaceUri.toCanonicalString(wsUri));
				deletedPaths.push(wsUri.relativePath);
			}
		}

		if (deletedPaths.length === 0) {
			return;
		}

		// Deletions may be folders; match by key or path prefix with boundary guards.
		const isDeletedUri = (uri: string) =>
			deletedUris.some(key => uri === key || uri.startsWith(key + '/'));

		const isDeletedPathEntry = (entry: string) => {
			const base = getGlobPatternBase(entry);

			return base.length > 0 && deletedPaths.some(path =>
				base === path || base.startsWith(path + '/') || base.startsWith(path + '#'));
		};

		// Prunes deleted entries from one of a profile's path arrays; returns the
		// kept entries when any were removed, or undefined when nothing changed.
		const pruneEntries = (entries: string[] | undefined): string[] | undefined => {
			if (!entries?.length) {
				return undefined;
			}

			const kept = entries.filter(entry => !isDeletedPathEntry(entry));

			return kept.length !== entries.length ? kept : undefined;
		};

		// Prune matching entries from the profiles of every scope that stores any.
		await this._profileSettings.updateEachScope(settings => {
			let changed = false;
			const profiles = { ...(settings.profiles ?? {}) };

			for (const [id, profile] of Object.entries(profiles)) {
				const keptInclude = pruneEntries(profile?.includeFiles);
				const keptExclude = pruneEntries(profile?.excludeFiles);

				if (!keptInclude && !keptExclude) {
					continue;
				}

				const next = { ...profile };

				if (keptInclude) {
					if (keptInclude.length > 0) {
						next.includeFiles = keptInclude;
					} else {
						delete next.includeFiles;
					}
				}

				if (keptExclude) {
					if (keptExclude.length > 0) {
						next.excludeFiles = keptExclude;
					} else {
						delete next.excludeFiles;
					}
				}

				profiles[id] = next;
				changed = true;
			}

			return changed ? { ...settings, profiles } : undefined;
		});

		// Warn about profiles that reference deleted shape files, across the merged view.
		const affectedProfiles = Object.entries(this._profileSettings.getMergedSettings().profiles ?? {})
			.filter(([, profile]) => toUniqueStringArray(profile?.shapes).some(isDeletedUri))
			.map(([id]) => id);

		if (affectedProfiles.length === 0) {
			return;
		}

		const action = await vscode.window.showWarningMessage(
			`Deleted files are still referenced as shape graphs by SHACL validation profiles. Affected profiles: ${affectedProfiles.join(', ')}`,
			'Manage Profiles'
		);

		if (action === 'Manage Profiles') {
			await vscode.commands.executeCommand('mentor.command.openSettings', 'validation.profiles');
		}
	}

	/**
	 * Checks whether a shape file URI exists: `workspace:` URIs are resolved
	 * against the file system, `user:` URIs against the settings-backed user
	 * file store, other URIs are looked up as graphs in the store.
	 */
	private async _shapeFileExists(uri: string): Promise<boolean> {
		let parsed: vscode.Uri;

		try {
			parsed = vscode.Uri.parse(uri, true);
		} catch {
			return false;
		}

		if (parsed.scheme === WorkspaceUri.uriScheme) {
			const fileUri = WorkspaceUri.tryToFileUri(parsed);

			if (!fileUri) {
				return false;
			}

			try {
				await vscode.workspace.fs.stat(fileUri);
				return true;
			} catch {
				return false;
			}
		}

		if (parsed.scheme === UserUri.uriScheme) {
			// Check the settings map, not the store: an entry that failed to parse
			// still exists as a file and must not be reported as a broken reference.
			const store = UserFileSystemProvider.getStore(USER_SHAPES_FOLDER);

			return store !== undefined && parsed.path.startsWith(`${USER_SHAPES_FOLDER}/`)
				&& store.has(parsed.path.slice(USER_SHAPES_FOLDER.length + 1));
		}

		return this._store.hasGraph(uri);
	}
}
