import * as vscode from 'vscode';
import { Store } from '@faubulous/mentor-rdf';
import { SettingsFileStore, SettingsFileChangeEvent, WorkspaceReference } from '@src/services/core';
import { UserUri } from '@src/providers/user-uri';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { getWorkspaceId } from '@src/utilities/vscode/workspace';
import { loadRdfContent } from '@src/utilities/rdf';
import { loadPresetShapeGraphs } from './presets';
import { ShaclProfileSettingsService } from './shacl-profile-settings-service';
import { getAllReferencedShapeUris } from './shacl-validation-configuration';
import { getErrorMessage } from '@src/utilities/error';

/**
 * The `mentor.files` path prefix under which user shape files are authored:
 * `user:///shapes/<file>`. This is only an authoring convention (used by the
 * create/import commands and the profile picker) — the loader treats user shape
 * graphs generically, by validation-profile reference, regardless of prefix.
 */
export const USER_SHAPES_FOLDER = 'shapes';

/**
 * Loads the SHACL shape graphs a validation run needs into the RDF store.
 *
 * The bundled preset shape graphs (`ONTOLOGY_SHAPES_URI`/`TAXONOMY_SHAPES_URI`)
 * are loaded eagerly at activation so profiles can reference them without a
 * workspace copy. Workspace (`workspace:///`) and user (`user:///`) shape files
 * are loaded lazily, on demand, when a validation profile references their graph
 * IRI (see ADR-0003) — each user shape under the canonical `user:///<path>` IRI,
 * the same IRI an open editor for that file produces, so live edits and settings
 * updates address one graph.
 *
 * The service observes the backing `mentor.files` settings value: local saves and
 * cross-machine Settings Sync updates reload already-loaded graphs and fire
 * {@link onDidChangeShapeGraphs}, which drives revalidation.
 */
export class ShapeGraphService implements vscode.Disposable {
	private readonly _log = vscode.window.createOutputChannel('Mentor Shapes', { log: true });

	private readonly _onDidChangeShapeGraphs = new vscode.EventEmitter<void>();

	/**
	 * Fires after user shape graphs were loaded, reloaded or removed from the store.
	 */
	readonly onDidChangeShapeGraphs = this._onDidChangeShapeGraphs.event;

	private readonly _disposables: vscode.Disposable[] = [];

	/**
	 * In-flight loads of workspace and user shape files, keyed by graph URI, so
	 * concurrent {@link ensureLoaded} calls for the same graph share a single read.
	 */
	private readonly _pendingLoads = new Map<string, Promise<boolean>>();

	/**
	 * Graph URIs whose source loaded successfully but produced no quads this
	 * session. The store's `hasGraph` only tracks graphs with at least one quad,
	 * so without this marker {@link ensureLoaded} would reload an empty source on
	 * every call and fire the change event each time — which the change reaction
	 * (revalidate + profile check) re-enters, livelocking the event loop.
	 * Invalidated when the backing file changes and cleared on {@link loadAll}.
	 */
	private readonly _emptyGraphs = new Set<string>();

	constructor(
		private readonly _store: Store,
		private readonly _files: SettingsFileStore,
		private readonly _profileSettings: ShaclProfileSettingsService
	) {
		this._disposables.push(this._files.onDidChangeEntries(e => this._handleFileChanges(e)));
	}

	/**
	 * Loads the bundled preset shape graphs into the store. Called at activation
	 * and after a workspace reindex (which wipes all graphs). User and workspace
	 * shape files are not loaded here — they load lazily via {@link ensureLoaded}
	 * when a validation profile references them. Loading never throws.
	 */
	async loadAll(): Promise<void> {
		// A reindex wipes the store's graphs; drop the empty markers with them so
		// lazy loading starts from a clean slate.
		this._emptyGraphs.clear();

		try {
			loadPresetShapeGraphs(this._store);
			this._log.info('Loaded the bundled preset shape graphs.');
		} catch (error) {
			this._log.error(`Failed to load the bundled preset shape graphs: ${error}`);
		}

		this._onDidChangeShapeGraphs.fire();
	}

	/**
	 * Loads every `workspace:///` and `user:///` shape graph referenced by a
	 * validation profile into the store (see ADR-0003). Runs at startup after the
	 * workspace root is resolved, independent of — and typically long before —
	 * workspace indexing, so validation never depends on the indexer having walked
	 * over a shape file.
	 */
	async loadReferencedShapeGraphs(): Promise<void> {
		const uris = getAllReferencedShapeUris(this._profileSettings.getMergedSettings());

		await this.ensureLoaded(uris);
	}

	/**
	 * Ensures the given shape graphs are present in the store, loading any missing
	 * `workspace:///` or `user:///` graph from its file. Concurrent calls for the
	 * same graph share a single file read; a graph whose file cannot be resolved or
	 * parsed stays absent (the caller's missing-graph handling reports it). Preset
	 * graphs are owned by {@link loadAll} and any other scheme is left untouched, so
	 * its absence is a genuine broken reference. Fires {@link onDidChangeShapeGraphs}
	 * when at least one graph was loaded.
	 * @param shapeGraphUris The shape graph URIs referenced by a validation run or profile.
	 */
	async ensureLoaded(shapeGraphUris: readonly string[]): Promise<void> {
		const loads: Promise<{ uri: string; loaded: boolean }>[] = [];

		for (const uri of new Set(shapeGraphUris)) {
			// Known-empty sources are as resolved as resident graphs: reloading them
			// cannot change the store, so retrying would only re-fire the change event.
			if (this._store.hasGraph(uri) || this._emptyGraphs.has(uri)) {
				continue;
			}

			let parsed: vscode.Uri;

			try {
				parsed = vscode.Uri.parse(uri, true);
			} catch {
				continue;
			}

			let load: (() => Promise<boolean>) | undefined;

			if (parsed.scheme === WorkspaceUri.uriScheme) {
				load = () => this._loadWorkspaceShapeFile(parsed, uri);
			} else if (parsed.scheme === UserUri.uriScheme) {
				load = () => this._loadUserShapeFile(parsed.path.replace(/^\/+/, ''), uri);
			} else {
				continue;
			}

			let pending = this._pendingLoads.get(uri);

			if (!pending) {
				pending = load().finally(() => this._pendingLoads.delete(uri));

				this._pendingLoads.set(uri, pending);
			}

			loads.push(pending.then(loaded => ({ uri, loaded })));
		}

		if (loads.length === 0) {
			return;
		}

		const results = await Promise.all(loads);

		// A source that loaded successfully but yielded no quads leaves the store
		// unchanged — remember it and treat it as not loaded, so nothing reacts and
		// later calls skip it (see _emptyGraphs). Failed loads stay retryable: the
		// self-healing resolution (ADR-0003) must pick the file up once it appears.
		let changed = false;

		for (const { uri, loaded } of results) {
			if (loaded && !this._store.hasGraph(uri)) {
				this._emptyGraphs.add(uri);
			} else if (loaded) {
				changed = true;
			}
		}

		if (changed) {
			this._onDidChangeShapeGraphs.fire();
		}
	}

	/**
	 * Loads one workspace shape file into the store under the given graph URI,
	 * returning whether the graph was loaded. Failures are logged and swallowed —
	 * the graph simply stays absent from the store.
	 */
	private async _loadWorkspaceShapeFile(workspaceUri: vscode.Uri, graphUri: string): Promise<boolean> {
		const fileUri = WorkspaceUri.tryToFileUri(workspaceUri);

		if (!fileUri) {
			this._log.warn(`Cannot resolve the workspace shape URI ${graphUri} to a file.`);
			return false;
		}

		try {
			const content = new TextDecoder().decode(await vscode.workspace.fs.readFile(fileUri));

			loadRdfContent(this._store, content, graphUri, workspaceUri.path);

			this._log.info(`Loaded workspace shape graph ${graphUri}.`);
			return true;
		} catch (error) {
			this._log.warn(`Skipped the workspace shape file ${graphUri}: ${getErrorMessage(error)}`);
			return false;
		}
	}

	/**
	 * Returns the canonical graph IRI of a user shape file.
	 * @param path The file path within the user file store, e.g. `shapes/my-shapes.ttl`.
	 */
	getUserShapeGraphUri(path: string): string {
		return UserUri.forPath(path);
	}

	/**
	 * The file names of all stored user shape files.
	 */
	getUserShapeFileNames(): string[] {
		return this._files.keys();
	}

	/**
	 * Whether a referenced shape graph has an existing source, even when it
	 * currently holds no triples. An empty user shape file is a valid (if empty)
	 * reference — validating against it is a harmless no-op — but the store's
	 * `hasGraph` only sees graphs with at least one quad, so on its own it would
	 * wrongly report such a reference as broken. The profile health check ORs this
	 * in so an existing-but-empty user shape file (which the profile picker also
	 * offers) is not flagged as missing.
	 * @param graphUri The referenced shape graph URI.
	 */
	hasShapeSource(graphUri: string): boolean {
		return this._files.keys().some(fileName => this.getUserShapeGraphUri(fileName) === graphUri);
	}

	/**
	 * Returns the user shape files not referenced by any validation profile in the
	 * user or the current workspace scope, each with the ids of *other* workspaces
	 * that reference it (from the synced reference registry). A file with a
	 * non-empty `protectedBy` is still used elsewhere; a file with an empty
	 * `protectedBy` is a genuine orphan.
	 */
	getUnreferencedUserShapeFiles(): { key: string; protectedBy: WorkspaceReference[] }[] {
		const referenced = new Set<string>([
			...getAllReferencedShapeUris(this._profileSettings.getSettings('user')),
			...getAllReferencedShapeUris(this._profileSettings.getSettings('workspace')),
		]);

		const workspaceId = getWorkspaceId();

		return this._files.keys()
			.filter(key => !referenced.has(this.getUserShapeGraphUri(key)))
			.map(key => ({
				key,
				// The current workspace's own registry entry is covered by the live
				// scan above, so only other workspaces protect the file here.
				protectedBy: this._files.getReferences(key).filter(ref => ref.id !== workspaceId),
			}));
	}

	/**
	 * Returns the user shape files that are genuinely orphaned: not referenced by
	 * any profile in the user or current workspace scope, and not protected by a
	 * reference from another workspace. This is what the automatic delete prompt
	 * offers. The *Clean Up User Shapes* command uses
	 * {@link getUnreferencedUserShapeFiles} instead, so it can also surface (and
	 * force-delete) files protected by other workspaces.
	 */
	getOrphanedUserShapeFiles(): string[] {
		return this.getUnreferencedUserShapeFiles()
			.filter(file => file.protectedBy.length === 0)
			.map(file => file.key);
	}

	dispose(): void {
		for (const disposable of this._disposables) {
			disposable.dispose();
		}

		this._onDidChangeShapeGraphs.dispose();
		this._log.dispose();
	}

	/**
	 * Loads one user shape file into the store under the given graph IRI, choosing
	 * the loader by file extension and returning whether the graph was loaded.
	 * Failures are logged and swallowed so one broken (e.g. hand-edited or synced)
	 * file never blocks the rest.
	 */
	private async _loadUserShapeFile(key: string, graphUri: string): Promise<boolean> {
		try {
			const content = await this._files.read(key);

			loadRdfContent(this._store, content, graphUri, key);

			this._log.info(`Loaded user shape graph ${graphUri}.`);
			return true;
		} catch (error) {
			this._log.warn(`Skipped the user shape file '${key}': ${getErrorMessage(error)}`);
			return false;
		}
	}

	private async _handleFileChanges(e: SettingsFileChangeEvent): Promise<void> {
		// The changed content may no longer be empty (or vice versa) — forget the
		// empty markers so the next ensureLoaded re-reads the affected files.
		for (const key of [...e.created, ...e.changed, ...e.deleted]) {
			this._emptyGraphs.delete(this.getUserShapeGraphUri(key));
		}

		let reloaded = false;

		// Only reload files whose graph is already loaded (i.e. referenced by a
		// profile and pulled in on demand). Others load lazily via ensureLoaded, so
		// there is no eager work to do here.
		for (const key of [...e.created, ...e.changed]) {
			const graphUri = this.getUserShapeGraphUri(key);

			if (this._store.hasGraph(graphUri)) {
				await this._loadUserShapeFile(key, graphUri);
				reloaded = true;
			}
		}

		const deletedGraphs = e.deleted
			.map(key => this.getUserShapeGraphUri(key))
			.filter(graphUri => this._store.hasGraph(graphUri));

		if (deletedGraphs.length > 0) {
			this._store.deleteGraphs(deletedGraphs);
			this._log.info(`Removed ${deletedGraphs.length} user shape graph(s) from the store.`);
		}

		// A changed file that is loaded nowhere can still be referenced by a profile
		// (its graph loads lazily on the next validation), in which case the health
		// check and open editors must react to the new content.
		const referenced = new Set(getAllReferencedShapeUris(this._profileSettings.getMergedSettings()));
		const changedReferenced = e.changed.some(key => referenced.has(this.getUserShapeGraphUri(key)));

		// Fire when validation state or the set of shape sources changed: a resident
		// graph was (re)loaded or removed, a referenced file's content changed, or a
		// file was created/deleted (the profile health check and the shape pickers
		// track file existence). The one suppressed case is a content change to an
		// unloaded, unreferenced file — e.g. Settings-Sync churn on a draft shape —
		// which previously triggered a full revalidation pass for nothing.
		if (reloaded || changedReferenced || e.created.length > 0 || e.deleted.length > 0) {
			this._onDidChangeShapeGraphs.fire();
		}
	}
}
