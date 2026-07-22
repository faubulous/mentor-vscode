import { describe, expect, test, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { Store } from '@faubulous/mentor-rdf';
import { SettingsFileStore, SettingsFileEntry } from '@src/services/core';
import { ShapeGraphService } from '@src/services/validation/shape-graph-service';
import { ShaclProfileSettingsService } from '@src/services/validation/shacl-profile-settings-service';
import { ONTOLOGY_SHAPES_URI, TAXONOMY_SHAPES_URI } from '@src/services/validation/preset-definitions';
import { getShapeGraphCandidates } from '@src/utilities/shacl';
import { compressToBase64 } from '@src/utilities/compression';

const SHAPE_TTL = '@prefix sh: <http://www.w3.org/ns/shacl#> . <http://example.org/shape> a sh:NodeShape .';
const SHAPE_NQ = '<http://example.org/shape> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/shacl#NodeShape> .';

let shapesValue: Record<string, SettingsFileEntry> | undefined;
let userValidation: any;
let workspaceValidation: any;
let listeners: Array<(e: vscode.ConfigurationChangeEvent) => void>;

function fireConfigurationChange(): void {
	for (const listener of [...listeners]) {
		listener({ affectsConfiguration: (section: string) => section === 'mentor.shacl.shapes' } as vscode.ConfigurationChangeEvent);
	}
}

/**
 * Waits for the fire-and-forget async change handling to settle.
 */
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

function createService(): { service: ShapeGraphService; store: Store } {
	const store = new Store();
	const files = new SettingsFileStore('shacl.shapes');
	const service = new ShapeGraphService(store, files, new ShaclProfileSettingsService());

	return { service, store };
}

beforeEach(() => {
	shapesValue = undefined;
	userValidation = undefined;
	workspaceValidation = undefined;
	listeners = [];

	(vscode.workspace as any).getConfiguration = (section?: string) => ({
		inspect: (key: string) => {
			const full = `${section ?? 'mentor'}.${key}`;

			if (full === 'mentor.shacl.shapes') {
				return { globalValue: shapesValue };
			}

			if (full === 'mentor.shacl.validation') {
				return { globalValue: userValidation, workspaceValue: workspaceValidation };
			}

			return undefined;
		},
		update: async (_key: string, value: any) => {
			shapesValue = value;
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
	test('loadAll registers the bundled preset shape graphs', async () => {
		const { service, store } = createService();

		await service.loadAll();

		expect(store.hasGraph(ONTOLOGY_SHAPES_URI)).toBe(true);
		expect(store.hasGraph(TAXONOMY_SHAPES_URI)).toBe(true);
		expect(getShapeGraphCandidates(store)).toEqual(
			expect.arrayContaining([ONTOLOGY_SHAPES_URI, TAXONOMY_SHAPES_URI])
		);
	});

	test('loadAll loads user shape files under their canonical user:/// graph IRIs', async () => {
		shapesValue = {
			'my-shapes.ttl': { encoding: 'gzip+base64', content: await compressToBase64(SHAPE_TTL) },
			'quads.nq': { encoding: 'plain', content: SHAPE_NQ },
		};

		const { service, store } = createService();

		await service.loadAll();

		expect(store.hasGraph('user:///shapes/my-shapes.ttl')).toBe(true);
		expect(store.hasGraph('user:///shapes/quads.nq')).toBe(true);
		expect(getShapeGraphCandidates(store)).toEqual(
			expect.arrayContaining(['user:///shapes/my-shapes.ttl', 'user:///shapes/quads.nq'])
		);
	});

	test('a broken user shape file is skipped and the rest still loads', async () => {
		shapesValue = {
			'broken.ttl': { encoding: 'plain', content: 'this is not turtle @@@' },
			'good.ttl': { encoding: 'plain', content: SHAPE_TTL },
		};

		const { service, store } = createService();

		await service.loadAll();

		expect(store.hasGraph('user:///shapes/broken.ttl')).toBe(false);
		expect(store.hasGraph('user:///shapes/good.ttl')).toBe(true);
	});

	test('reacts to settings changes: create, change and delete', async () => {
		const { service, store } = createService();
		await service.loadAll();

		let changes = 0;
		service.onDidChangeShapeGraphs(() => changes++);

		// Create (e.g. a Settings Sync update from another machine).
		shapesValue = { 'synced.ttl': { encoding: 'plain', content: SHAPE_TTL } };
		fireConfigurationChange();
		await settle();

		expect(store.hasGraph('user:///shapes/synced.ttl')).toBe(true);

		// Change: the graph is reloaded with the new content.
		shapesValue = {
			'synced.ttl': {
				encoding: 'plain',
				content: SHAPE_TTL + '\n<http://example.org/other> a sh:NodeShape .',
			},
		};
		fireConfigurationChange();
		await settle();

		expect(store.hasGraph('user:///shapes/synced.ttl')).toBe(true);

		// Delete: the graph is removed from the store.
		shapesValue = undefined;
		fireConfigurationChange();
		await settle();

		expect(store.hasGraph('user:///shapes/synced.ttl')).toBe(false);
		expect(changes).toBe(3);
	});

	test('getOrphanedUserShapeFiles reports files unreferenced in both scopes', async () => {
		shapesValue = {
			'used-by-user.ttl': { encoding: 'plain', content: SHAPE_TTL },
			'used-by-workspace.ttl': { encoding: 'plain', content: SHAPE_TTL },
			'orphan.ttl': { encoding: 'plain', content: SHAPE_TTL },
		};

		userValidation = {
			profiles: { a: { shapes: ['user:///shapes/used-by-user.ttl'] } },
		};

		workspaceValidation = {
			profiles: { b: { shapes: ['user:///shapes/used-by-workspace.ttl', ONTOLOGY_SHAPES_URI] } },
		};

		const { service } = createService();

		expect(service.getOrphanedUserShapeFiles()).toEqual(['orphan.ttl']);
	});
});
