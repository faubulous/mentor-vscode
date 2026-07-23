import * as vscode from 'vscode';
import { Store } from '@faubulous/mentor-rdf';
import { SettingsFileStore, SettingsFileChangeEvent } from '@src/services/core';
import { UserUri } from '@src/providers/user-uri';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { loadPresetShapeGraphs } from './presets';
import { ShaclProfileSettingsService } from './shacl-profile-settings-service';
import { getAllReferencedShapeUris } from './shacl-validation-configuration';

/**
 * The virtual folder of the user shape files: `user:///shapes/<file>`.
 */
export const USER_SHAPES_FOLDER = '/shapes';

/**
 * Loads the workspace-independent SHACL shape graphs into the RDF store:
 *
 * 1. The bundled preset shape graphs (`ONTOLOGY_SHAPES_URI`/`TAXONOMY_SHAPES_URI`),
 *    so validation profiles can reference them without a workspace copy.
 * 2. The user shape files stored in `mentor.shacl.shapes`, each loaded under its
 *    canonical `user:///shapes/<file>` graph IRI — the same IRI an open editor
 *    for that file produces, so live edits and settings updates address one graph.
 *
 * The service observes the backing settings value: local saves and cross-machine
 * Settings Sync updates both reload the affected graphs and fire
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
	 * In-flight loads of workspace shape files, keyed by graph URI, so concurrent
	 * {@link ensureLoaded} calls for the same graph share a single file read.
	 */
	private readonly _pendingLoads = new Map<string, Promise<boolean>>();

	constructor(
		private readonly _store: Store,
		private readonly _files: SettingsFileStore,
		private readonly _profileSettings: ShaclProfileSettingsService
	) {
		this._disposables.push(this._files.onDidChangeEntries(e => this._handleFileChanges(e)));
	}

	/**
	 * Loads the bundled preset shape graphs and all user shape files into the
	 * store. Called at activation and after a workspace reindex (which wipes all
	 * graphs). A broken file is skipped and logged; loading never throws.
	 */
	async loadAll(): Promise<void> {
		try {
			loadPresetShapeGraphs(this._store);
			this._log.info('Loaded the bundled preset shape graphs.');
		} catch (error) {
			this._log.error(`Failed to load the bundled preset shape graphs: ${error}`);
		}

		for (const key of this._files.keys()) {
			await this._loadFile(key);
		}

		this._onDidChangeShapeGraphs.fire();
	}

	/**
	 * Loads every `workspace:///` shape graph referenced by a validation profile
	 * into the store (see ADR-0003). Runs at startup after the workspace root is
	 * resolved, independent of — and typically long before — workspace indexing,
	 * so validation never depends on the indexer having walked over a shape file.
	 */
	async loadReferencedShapeGraphs(): Promise<void> {
		const uris = getAllReferencedShapeUris(this._profileSettings.getMergedSettings());

		await this.ensureLoaded(uris);
	}

	/**
	 * Ensures the given shape graphs are present in the store, loading any missing
	 * `workspace:///` graph from its file. Concurrent calls for the same graph share
	 * a single file read; a graph whose file cannot be resolved or parsed stays
	 * absent (the caller's missing-graph handling reports it). Non-workspace URIs
	 * are not loaded here: presets and `user:///` shapes are owned by
	 * {@link loadAll}, so their absence is a genuine broken reference.
	 * Fires {@link onDidChangeShapeGraphs} when at least one graph was loaded.
	 * @param shapeGraphUris The shape graph URIs referenced by a validation run or profile.
	 */
	async ensureLoaded(shapeGraphUris: readonly string[]): Promise<void> {
		const loads: Promise<boolean>[] = [];

		for (const uri of new Set(shapeGraphUris)) {
			if (this._store.hasGraph(uri)) {
				continue;
			}

			let parsed: vscode.Uri;

			try {
				parsed = vscode.Uri.parse(uri, true);
			} catch {
				continue;
			}

			if (parsed.scheme !== WorkspaceUri.uriScheme) {
				continue;
			}

			let pending = this._pendingLoads.get(uri);

			if (!pending) {
				pending = this._loadWorkspaceShapeFile(parsed, uri)
					.finally(() => this._pendingLoads.delete(uri));

				this._pendingLoads.set(uri, pending);
			}

			loads.push(pending);
		}

		if (loads.length === 0) {
			return;
		}

		const results = await Promise.all(loads);

		if (results.some(loaded => loaded)) {
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

			if (workspaceUri.path.endsWith('.nq')) {
				this._store.loadNQuads(content, graphUri, false, true);
			} else {
				// .ttl and .nt — the Turtle loader handles both.
				this._store.loadTurtle(content, graphUri, false, true);
			}

			this._log.info(`Loaded workspace shape graph ${graphUri}.`);
			return true;
		} catch (error) {
			this._log.warn(`Skipped the workspace shape file ${graphUri}: ${error instanceof Error ? error.message : error}`);
			return false;
		}
	}

	/**
	 * Returns the canonical graph IRI of a user shape file.
	 * @param fileName The file name within the shapes folder, e.g. `my-shapes.ttl`.
	 */
	getUserShapeGraphUri(fileName: string): string {
		return UserUri.forFile(USER_SHAPES_FOLDER, fileName);
	}

	/**
	 * The file names of all stored user shape files.
	 */
	getUserShapeFileNames(): string[] {
		return this._files.keys();
	}

	/**
	 * Returns the user shape files that are not referenced by any validation
	 * profile in the user or the current workspace scope.
	 *
	 * Note: profiles of *other* workspaces are invisible here, so callers must
	 * treat the result as advisory when offering to delete files.
	 */
	getOrphanedUserShapeFiles(): string[] {
		const referenced = new Set<string>([
			...getAllReferencedShapeUris(this._profileSettings.getSettings('user')),
			...getAllReferencedShapeUris(this._profileSettings.getSettings('workspace')),
		]);

		return this._files.keys().filter(key => !referenced.has(this.getUserShapeGraphUri(key)));
	}

	dispose(): void {
		for (const disposable of this._disposables) {
			disposable.dispose();
		}

		this._onDidChangeShapeGraphs.dispose();
		this._log.dispose();
	}

	/**
	 * Loads one user shape file into the store under its canonical graph IRI,
	 * choosing the loader by file extension. Failures are logged and swallowed
	 * so one broken (e.g. hand-edited or synced) file never blocks the rest.
	 */
	private async _loadFile(fileName: string): Promise<void> {
		const graphUri = this.getUserShapeGraphUri(fileName);

		try {
			const content = await this._files.read(fileName);

			if (fileName.endsWith('.nq')) {
				this._store.loadNQuads(content, graphUri, false, true);
			} else {
				// .ttl and .nt — the Turtle loader handles both.
				this._store.loadTurtle(content, graphUri, false, true);
			}

			this._log.info(`Loaded user shape graph ${graphUri}.`);
		} catch (error) {
			this._log.warn(`Skipped the user shape file '${fileName}': ${error instanceof Error ? error.message : error}`);
		}
	}

	private async _handleFileChanges(e: SettingsFileChangeEvent): Promise<void> {
		for (const key of [...e.created, ...e.changed]) {
			await this._loadFile(key);
		}

		if (e.deleted.length > 0) {
			this._store.deleteGraphs(e.deleted.map(key => this.getUserShapeGraphUri(key)));
			this._log.info(`Removed ${e.deleted.length} user shape graph(s) from the store.`);
		}

		this._onDidChangeShapeGraphs.fire();
	}
}
