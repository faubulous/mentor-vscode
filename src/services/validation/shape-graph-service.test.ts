import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { Store } from '@faubulous/mentor-rdf';
import { SettingsFileStore } from '@src/services/core';
import { SettingsFileEntry } from '@src/services/core/settings-file-store';
import { ShapeGraphService } from '@src/services/validation/shape-graph-service';
import { ShaclProfileSettingsService } from '@src/services/validation/shacl-profile-settings-service';
import { ONTOLOGY_SHAPES_URI, TAXONOMY_SHAPES_URI } from '@src/services/validation/preset-definitions';
import { getShapeGraphCandidates } from '@src/utilities/shacl';
import { compressToBase64 } from '@src/utilities/compression';

const SHAPE_TTL = '@prefix sh: <http://www.w3.org/ns/shacl#> . <http://example.org/shape> a sh:NodeShape .';
const SHAPE_NQ = '<http://example.org/shape> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#NodeShape> .';

let filesValue: Record<string, SettingsFileEntry> | undefined;
let userValidation: any;
let workspaceValidation: any;
let workspaceId: string | undefined;
let listeners: Array<(e: vscode.ConfigurationChangeEvent) => void>;

function fireConfigurationChange(): void {
	for (const listener of [...listeners]) {
		listener({ affectsConfiguration: (section: string) => section === 'mentor.files' } as vscode.ConfigurationChangeEvent);
	}
}

/**
 * Waits for the fire-and-forget async change handling to settle.
 */
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

function createService(): { service: ShapeGraphService; store: Store; files: SettingsFileStore } {
	const store = new Store();
	const files = new SettingsFileStore('files');
	const service = new ShapeGraphService(store, files, new ShaclProfileSettingsService());

	return { service, store, files };
}

beforeEach(() => {
	filesValue = undefined;
	userValidation = undefined;
	workspaceValidation = undefined;
	workspaceId = undefined;
	listeners = [];

	(vscode.workspace as any).getConfiguration = (section?: string) => ({
		inspect: (key: string) => {
			const full = `${section ?? 'mentor'}.${key}`;

			if (full === 'mentor.files') {
				return { globalValue: filesValue };
			}

			if (full === 'mentor.shacl.validation') {
				return { globalValue: userValidation, workspaceValue: workspaceValidation };
			}

			if (full === 'mentor.workspaceId') {
				return { workspaceValue: workspaceId };
			}

			return undefined;
		},
		update: async (_key: string, value: any) => {
			filesValue = value;
			fireConfigurationChange();
		},
		get: (_key: string, defaultValue?: any) => defaultValue,
	});

	(vscode.workspace as any).onDidChangeConfiguration = (handler: any) => {
		listeners.push(handler);
		return { dispose: () => listeners.splice(listeners.indexOf(handler), 1) };
	};
});

describe('ShapeGraphService', () => {
	test('loadAll registers the bundled preset shape graphs but not user shapes', async () => {
		filesValue = {
			'shapes/my-shapes.ttl': { encoding: 'gzip+base64', content: await compressToBase64(SHAPE_TTL) },
		};

		const { service, store } = createService();

		await service.loadAll();

		expect(store.hasGraph(ONTOLOGY_SHAPES_URI)).toBe(true);
		expect(store.hasGraph(TAXONOMY_SHAPES_URI)).toBe(true);
		expect(getShapeGraphCandidates(store)).toEqual(
			expect.arrayContaining([ONTOLOGY_SHAPES_URI, TAXONOMY_SHAPES_URI])
		);

		// User shapes load lazily, on reference — never eagerly by loadAll.
		expect(store.hasGraph('user:///shapes/my-shapes.ttl')).toBe(false);
	});

	test('ensureLoaded lazily loads user shape files under their canonical user:/// graph IRIs', async () => {
		filesValue = {
			'shapes/my-shapes.ttl': { encoding: 'gzip+base64', content: await compressToBase64(SHAPE_TTL) },
			'shapes/quads.nq': { encoding: 'plain', content: SHAPE_NQ },
		};

		const { service, store } = createService();

		await service.ensureLoaded(['user:///shapes/my-shapes.ttl', 'user:///shapes/quads.nq']);

		expect(store.hasGraph('user:///shapes/my-shapes.ttl')).toBe(true);
		expect(store.hasGraph('user:///shapes/quads.nq')).toBe(true);
		expect(getShapeGraphCandidates(store)).toEqual(
			expect.arrayContaining(['user:///shapes/my-shapes.ttl', 'user:///shapes/quads.nq'])
		);
	});

	test('ensureLoaded supports nested user shape paths', async () => {
		filesValue = {
			'shapes/core/base.ttl': { encoding: 'plain', content: SHAPE_TTL },
		};

		const { service, store } = createService();

		await service.ensureLoaded(['user:///shapes/core/base.ttl']);

		expect(store.hasGraph('user:///shapes/core/base.ttl')).toBe(true);
	});

	test('a broken user shape file is skipped and the rest still loads', async () => {
		filesValue = {
			'shapes/broken.ttl': { encoding: 'plain', content: 'this is not turtle @@@' },
			'shapes/good.ttl': { encoding: 'plain', content: SHAPE_TTL },
		};

		const { service, store } = createService();

		await service.ensureLoaded(['user:///shapes/broken.ttl', 'user:///shapes/good.ttl']);

		expect(store.hasGraph('user:///shapes/broken.ttl')).toBe(false);
		expect(store.hasGraph('user:///shapes/good.ttl')).toBe(true);
	});

	test('hasShapeSource recognizes an existing but empty user shape file that has no graph', async () => {
		// An empty shape file loads to zero triples, so the store has no graph for
		// it — but the file exists and the profile picker offers it, so the health
		// check must not treat it as a broken reference.
		filesValue = {
			'shapes/empty.ttl': { encoding: 'plain', content: '# no shapes yet\n' },
		};

		const { service } = createService();

		expect(service.hasShapeSource('user:///shapes/empty.ttl')).toBe(true);

		// A URI with no backing user shape file is genuinely missing.
		expect(service.hasShapeSource('user:///shapes/gone.ttl')).toBe(false);
	});

	test('does not eagerly load a created but unreferenced file, yet reports the change', async () => {
		const { service, store } = createService();
		await service.loadAll();

		let changes = 0;
		service.onDidChangeShapeGraphs(() => changes++);

		// Create (e.g. a Settings Sync update from another machine).
		filesValue = { 'shapes/synced.ttl': { encoding: 'plain', content: SHAPE_TTL } };
		fireConfigurationChange();
		await settle();

		// Lazy: an unreferenced new file is not pulled into the store...
		expect(store.hasGraph('user:///shapes/synced.ttl')).toBe(false);
		// ...but the change is still surfaced so the profile health check re-runs.
		expect(changes).toBe(1);
	});

	test('reloads an already-loaded graph on change and removes it on delete', async () => {
		filesValue = { 'shapes/synced.ttl': { encoding: 'plain', content: SHAPE_TTL } };

		const { service, store } = createService();

		// Reference pulls it in on demand.
		await service.ensureLoaded(['user:///shapes/synced.ttl']);
		expect(store.hasGraph('user:///shapes/synced.ttl')).toBe(true);

		let changes = 0;
		service.onDidChangeShapeGraphs(() => changes++);

		// Change: the already-loaded graph is reloaded with the new content.
		filesValue = {
			'shapes/synced.ttl': {
				encoding: 'plain',
				content: SHAPE_TTL + '\n<http://example.org/other> a sh:NodeShape .',
			},
		};
		fireConfigurationChange();
		await settle();

		expect(store.hasGraph('user:///shapes/synced.ttl')).toBe(true);

		// Delete: the graph is removed from the store.
		filesValue = undefined;
		fireConfigurationChange();
		await settle();

		expect(store.hasGraph('user:///shapes/synced.ttl')).toBe(false);
		expect(changes).toBe(2);
	});

	test('loads an existing-but-empty shape once, without firing (livelock regression)', async () => {
		filesValue = { 'shapes/empty.ttl': { encoding: 'plain', content: '# no shapes yet\n' } };

		const { service, store, files } = createService();
		const read = vi.spyOn(files, 'read');

		let changes = 0;
		service.onDidChangeShapeGraphs(() => changes++);

		// A load that yields no quads leaves the store unchanged: it must not fire
		// the change event — the change reaction re-enters ensureLoaded, so a fire
		// here would loop forever (reload → fire → reaction → reload → …).
		await service.ensureLoaded(['user:///shapes/empty.ttl']);

		expect(read).toHaveBeenCalledTimes(1);
		expect(changes).toBe(0);
		expect(store.hasGraph('user:///shapes/empty.ttl')).toBe(false);

		// Subsequent calls (each validation run, each reaction pass) skip the
		// known-empty source entirely instead of re-reading it.
		await service.ensureLoaded(['user:///shapes/empty.ttl']);
		await service.ensureLoaded(['user:///shapes/empty.ttl']);

		expect(read).toHaveBeenCalledTimes(1);
		expect(changes).toBe(0);
	});

	test('re-reads a previously-empty shape after its content changes', async () => {
		filesValue = { 'shapes/empty.ttl': { encoding: 'plain', content: '# no shapes yet\n' } };

		const { service, store } = createService();

		await service.ensureLoaded(['user:///shapes/empty.ttl']);
		expect(store.hasGraph('user:///shapes/empty.ttl')).toBe(false);

		let changes = 0;
		service.onDidChangeShapeGraphs(() => changes++);

		// The user fills the skeleton with a real shape.
		filesValue = { 'shapes/empty.ttl': { encoding: 'plain', content: SHAPE_TTL } };
		fireConfigurationChange();
		await settle();

		// The next demand-load picks up the new content and fires once.
		await service.ensureLoaded(['user:///shapes/empty.ttl']);

		expect(store.hasGraph('user:///shapes/empty.ttl')).toBe(true);
		expect(changes).toBe(1);
	});

	test('suppresses the change event for content edits to unloaded, unreferenced files', async () => {
		filesValue = { 'shapes/draft.ttl': { encoding: 'plain', content: SHAPE_TTL } };

		const { service, store } = createService();

		let changes = 0;
		service.onDidChangeShapeGraphs(() => changes++);

		// A pure content change (e.g. Settings-Sync churn) to a file no profile
		// references and no editor loaded must not wake the validation pipeline.
		filesValue = { 'shapes/draft.ttl': { encoding: 'plain', content: SHAPE_TTL + '\n# edited' } };
		fireConfigurationChange();
		await settle();

		expect(changes).toBe(0);
		expect(store.hasGraph('user:///shapes/draft.ttl')).toBe(false);
	});

	test('fires the change event for content edits to a profile-referenced file even when unloaded', async () => {
		filesValue = { 'shapes/lazy.ttl': { encoding: 'plain', content: SHAPE_TTL } };
		userValidation = { profiles: { p: { shapes: ['user:///shapes/lazy.ttl'] } } };

		const { service } = createService();

		let changes = 0;
		service.onDidChangeShapeGraphs(() => changes++);

		filesValue = { 'shapes/lazy.ttl': { encoding: 'plain', content: SHAPE_TTL + '\n# edited' } };
		fireConfigurationChange();
		await settle();

		expect(changes).toBe(1);
	});

	test('getOrphanedUserShapeFiles reports files unreferenced in both scopes', async () => {
		filesValue = {
			'shapes/used-by-user.ttl': { encoding: 'plain', content: SHAPE_TTL },
			'shapes/used-by-workspace.ttl': { encoding: 'plain', content: SHAPE_TTL },
			'shapes/orphan.ttl': { encoding: 'plain', content: SHAPE_TTL },
		};

		userValidation = {
			profiles: { a: { shapes: ['user:///shapes/used-by-user.ttl'] } },
		};

		workspaceValidation = {
			profiles: { b: { shapes: ['user:///shapes/used-by-workspace.ttl', ONTOLOGY_SHAPES_URI] } },
		};

		const { service } = createService();

		expect(service.getOrphanedUserShapeFiles()).toEqual(['shapes/orphan.ttl']);
	});

	test('getUnreferencedUserShapeFiles marks files referenced by another workspace as protected', () => {
		filesValue = {
			'shapes/protected.ttl': { encoding: 'plain', content: SHAPE_TTL, references: [{ id: 'other-ws', name: 'Other' }] },
			'shapes/orphan.ttl': { encoding: 'plain', content: SHAPE_TTL },
		};

		const { service } = createService();

		expect(service.getUnreferencedUserShapeFiles()).toEqual(
			expect.arrayContaining([
				{ key: 'shapes/protected.ttl', protectedBy: [{ id: 'other-ws', name: 'Other' }] },
				{ key: 'shapes/orphan.ttl', protectedBy: [] },
			])
		);
	});

	test('getOrphanedUserShapeFiles excludes files protected by another workspace', () => {
		filesValue = {
			'shapes/protected.ttl': { encoding: 'plain', content: SHAPE_TTL, references: [{ id: 'other-ws', name: 'Other' }] },
			'shapes/orphan.ttl': { encoding: 'plain', content: SHAPE_TTL },
		};

		const { service } = createService();

		expect(service.getOrphanedUserShapeFiles()).toEqual(['shapes/orphan.ttl']);
	});

	test('a file registered only by the current workspace is still treated as orphaned', () => {
		// getWorkspaceId() reads mentor.workspaceId from the workspace scope.
		workspaceId = 'current-ws';
		filesValue = {
			'shapes/x.ttl': { encoding: 'plain', content: SHAPE_TTL, references: [{ id: 'current-ws', name: 'Current' }] },
		};

		const { service } = createService();

		// Not live-referenced, and its only registry owner is the current workspace
		// (whose live refs already cover it) — so it is a genuine orphan.
		expect(service.getOrphanedUserShapeFiles()).toEqual(['shapes/x.ttl']);
	});
});

describe('ShapeGraphService workspace shape loading', () => {
	const SHAPE_URI = 'workspace:///.mentor/shapes/test.shape.ttl';

	let readFileCalls: string[];

	beforeEach(() => {
		WorkspaceUri.rootUri = vscode.Uri.parse('file:///repo');
		readFileCalls = [];

		(vscode.workspace as any).fs = {
			readFile: async (uri: vscode.Uri) => {
				readFileCalls.push(uri.toString());

				if (uri.path.includes('missing')) {
					throw new Error('ENOENT');
				}

				return new TextEncoder().encode(SHAPE_TTL);
			},
		};
	});

	afterEach(() => {
		WorkspaceUri.rootUri = undefined;
		delete (vscode.workspace as any).fs;
	});

	test('ensureLoaded loads a missing workspace shape graph from its file', async () => {
		const { service, store } = createService();

		await service.ensureLoaded([SHAPE_URI]);

		expect(store.hasGraph(SHAPE_URI)).toBe(true);
		expect(readFileCalls).toEqual(['file:///repo/.mentor/shapes/test.shape.ttl']);
	});

	test('ensureLoaded does not re-read a graph that is already in the store', async () => {
		const { service } = createService();

		await service.ensureLoaded([SHAPE_URI]);
		await service.ensureLoaded([SHAPE_URI]);

		expect(readFileCalls).toHaveLength(1);
	});

	test('ensureLoaded shares a single file read between concurrent calls', async () => {
		const { service, store } = createService();

		await Promise.all([
			service.ensureLoaded([SHAPE_URI]),
			service.ensureLoaded([SHAPE_URI, SHAPE_URI]),
		]);

		expect(store.hasGraph(SHAPE_URI)).toBe(true);
		expect(readFileCalls).toHaveLength(1);
	});

	test('ensureLoaded leaves the graph absent when the file cannot be read', async () => {
		const missingUri = 'workspace:///.mentor/shapes/missing.shape.ttl';
		const { service, store } = createService();

		await service.ensureLoaded([missingUri]);

		expect(store.hasGraph(missingUri)).toBe(false);
	});

	test('ensureLoaded does not touch the workspace file system for user or other-scheme URIs', async () => {
		const { service, store } = createService();

		// No backing settings entry for the user URI, and https is an unknown scheme.
		await service.ensureLoaded(['user:///shapes/not-backed.ttl', 'https://example.org/shapes']);

		expect(readFileCalls).toHaveLength(0);
		expect(store.hasGraph('user:///shapes/not-backed.ttl')).toBe(false);
	});

	test('ensureLoaded refuses to resolve a URI escaping the workspace root', async () => {
		const traversalUri = 'workspace:///../../etc/passwd.ttl';
		const { service, store } = createService();

		await service.ensureLoaded([traversalUri]);

		expect(readFileCalls).toHaveLength(0);
		expect(store.hasGraph(traversalUri)).toBe(false);
	});

	test('ensureLoaded fires onDidChangeShapeGraphs only when a graph was loaded', async () => {
		const { service } = createService();

		let changes = 0;
		service.onDidChangeShapeGraphs(() => changes++);

		await service.ensureLoaded([SHAPE_URI]);
		expect(changes).toBe(1);

		// Already loaded and unresolvable URIs cause no event.
		await service.ensureLoaded([SHAPE_URI]);
		await service.ensureLoaded(['workspace:///.mentor/shapes/missing.shape.ttl']);
		expect(changes).toBe(1);
	});

	test('loadReferencedShapeGraphs loads the workspace and user shapes referenced by profiles', async () => {
		filesValue = {
			'shapes/user.ttl': { encoding: 'plain', content: SHAPE_TTL },
		};

		userValidation = {
			profiles: { a: { shapes: [SHAPE_URI, 'user:///shapes/user.ttl'] } },
		};

		workspaceValidation = {
			profiles: { b: { shapes: ['workspace:///shapes/other.shape.ttl'] } },
		};

		const { service, store } = createService();

		await service.loadReferencedShapeGraphs();

		expect(store.hasGraph(SHAPE_URI)).toBe(true);
		expect(store.hasGraph('workspace:///shapes/other.shape.ttl')).toBe(true);
		expect(store.hasGraph('user:///shapes/user.ttl')).toBe(true);
		expect(readFileCalls).toHaveLength(2);
	});
});
