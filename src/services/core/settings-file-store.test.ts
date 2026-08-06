import { describe, expect, test, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { SettingsFileStore, SettingsFileChangeEvent, SettingsFileEntry } from '@src/services/core/settings-file-store';
import { compressToBase64 } from '@src/utilities/compression';

/**
 * In-memory stand-in for the user-level `mentor.files` value. The fake
 * `update` mirrors the real host by firing the configuration-change listeners
 * after a write.
 */
let globalValue: Record<string, SettingsFileEntry> | undefined;
let updates: { key: string; value: unknown; target: number }[];
let listeners: Array<(e: vscode.ConfigurationChangeEvent) => void>;

function fireConfigurationChange(): void {
	for (const listener of [...listeners]) {
		listener({ affectsConfiguration: (section: string) => section === 'mentor.files' } as vscode.ConfigurationChangeEvent);
	}
}

beforeEach(() => {
	globalValue = undefined;
	updates = [];
	listeners = [];

	(vscode.workspace as any).getConfiguration = () => ({
		inspect: (_key: string) => ({ globalValue }),
		update: async (key: string, value: any, target: number) => {
			updates.push({ key, value, target });
			globalValue = value;
			fireConfigurationChange();
		},
	});

	(vscode.workspace as any).onDidChangeConfiguration = (handler: any) => {
		listeners.push(handler);
		return { dispose: () => listeners.splice(listeners.indexOf(handler), 1) };
	};
});

describe('SettingsFileStore', () => {
	test('write stores gzip+base64 in the global scope and read round-trips', async () => {
		const store = new SettingsFileStore('files');

		await store.write('my-shapes.ttl', '<a> a <b> .');

		expect(updates).toHaveLength(1);
		expect(updates[0].target).toBe(vscode.ConfigurationTarget.Global);
		expect(globalValue!['my-shapes.ttl'].encoding).toBe('gzip+base64');
		expect(globalValue!['my-shapes.ttl'].content).not.toContain('<a>');

		expect(await store.read('my-shapes.ttl')).toBe('<a> a <b> .');
	});

	test('read tolerates plain entries', async () => {
		globalValue = { 'hand-edited.ttl': { encoding: 'plain', content: '<x> a <y> .' } };

		const store = new SettingsFileStore('files');

		expect(await store.read('hand-edited.ttl')).toBe('<x> a <y> .');
	});

	test('read throws for a missing entry', async () => {
		const store = new SettingsFileStore('files');

		await expect(store.read('nope.ttl')).rejects.toThrow(/nope\.ttl/);
	});

	test('write preserves sibling entries', async () => {
		globalValue = { 'other.ttl': { encoding: 'plain', content: '<o> a <k> .' } };

		const store = new SettingsFileStore('files');

		await store.write('new.ttl', '<n> a <e> .');

		expect(Object.keys(globalValue!).sort()).toEqual(['new.ttl', 'other.ttl']);
		expect(await store.read('other.ttl')).toBe('<o> a <k> .');
	});

	test('deleting the last entry clears the settings key', async () => {
		globalValue = { 'only.ttl': { encoding: 'plain', content: '<a> a <b> .' } };

		const store = new SettingsFileStore('files');

		await store.delete('only.ttl');

		expect(updates[0].value).toBeUndefined();
		expect(store.keys()).toEqual([]);
	});

	test('rejects entries exceeding the size gate without writing', async () => {
		const store = new SettingsFileStore('files', { maxEntryLength: 16 });

		await expect(store.write('big.ttl', 'x'.repeat(10_000) + Math.random())).rejects.toThrow(/too large/);
		expect(updates).toHaveLength(0);
	});

	test('rename keeps the stored content and rejects missing sources', async () => {
		const encoded = await compressToBase64('<a> a <b> .');
		globalValue = { 'old.ttl': { encoding: 'gzip+base64', content: encoded } };

		const store = new SettingsFileStore('files');

		await store.rename('old.ttl', 'new.ttl');

		expect(store.has('old.ttl')).toBe(false);
		expect(await store.read('new.ttl')).toBe('<a> a <b> .');

		await expect(store.rename('ghost.ttl', 'x.ttl')).rejects.toThrow(/ghost\.ttl/);
	});

	test('reports created, changed and deleted keys on external value changes', async () => {
		const store = new SettingsFileStore('files');
		const events: SettingsFileChangeEvent[] = [];
		store.onDidChangeEntries(e => events.push(e));

		// Simulate a Settings Sync update arriving from another machine.
		globalValue = { 'a.ttl': { encoding: 'plain', content: 'one' } };
		fireConfigurationChange();

		globalValue = { 'a.ttl': { encoding: 'plain', content: 'two' } };
		fireConfigurationChange();

		globalValue = undefined;
		fireConfigurationChange();

		expect(events).toEqual([
			{ created: ['a.ttl'], changed: [], deleted: [] },
			{ created: [], changed: ['a.ttl'], deleted: [] },
			{ created: [], changed: [], deleted: ['a.ttl'] },
		]);
	});

	test('bumps mtimes on observed changes and drops them on deletion', async () => {
		const store = new SettingsFileStore('files');

		expect(store.mtime('a.ttl')).toBe(0);

		globalValue = { 'a.ttl': { encoding: 'plain', content: 'one' } };
		fireConfigurationChange();

		const created = store.mtime('a.ttl');
		expect(created).toBeGreaterThan(0);

		globalValue = undefined;
		fireConfigurationChange();

		expect(store.mtime('a.ttl')).toBe(0);
	});

	test('ignores configuration changes that do not alter the map', () => {
		globalValue = { 'a.ttl': { encoding: 'plain', content: 'one' } };

		const store = new SettingsFileStore('files');
		const events: SettingsFileChangeEvent[] = [];
		store.onDidChangeEntries(e => events.push(e));

		fireConfigurationChange();

		expect(events).toEqual([]);
	});

	test('serializes concurrent writes so no entry is lost', async () => {
		const store = new SettingsFileStore('files');

		await Promise.all([
			store.write('a.ttl', '<a> a <x> .'),
			store.write('b.ttl', '<b> a <x> .'),
			store.write('c.ttl', '<c> a <x> .'),
		]);

		expect(store.keys().sort()).toEqual(['a.ttl', 'b.ttl', 'c.ttl']);
	});

	test('write preserves an existing references field', async () => {
		globalValue = { 'shapes/x.ttl': { encoding: 'plain', content: 'old', references: [{ id: 'ws-a', name: 'A' }] } };

		const store = new SettingsFileStore('files');

		await store.write('shapes/x.ttl', '<a> a <b> .');

		expect(globalValue!['shapes/x.ttl'].references).toEqual([{ id: 'ws-a', name: 'A' }]);
		expect(await store.read('shapes/x.ttl')).toBe('<a> a <b> .');
	});

	test('setReferences adds, clears and skips missing entries', async () => {
		globalValue = {
			'shapes/x.ttl': { encoding: 'plain', content: 'x' },
			'shapes/y.ttl': { encoding: 'plain', content: 'y', references: [{ id: 'ws-a', name: 'A' }] },
		};

		const store = new SettingsFileStore('files');

		await store.setReferences({
			'shapes/x.ttl': [{ id: 'ws-a', name: 'A' }],        // adds
			'shapes/y.ttl': [],                                 // clears
			'shapes/missing.ttl': [{ id: 'ws-b', name: 'B' }],  // skipped — no backing entry
		});

		expect(globalValue!['shapes/x.ttl'].references).toEqual([{ id: 'ws-a', name: 'A' }]);
		expect(globalValue!['shapes/y.ttl'].references).toBeUndefined();
		expect(globalValue!['shapes/missing.ttl']).toBeUndefined();
		expect(store.getReferences('shapes/x.ttl')).toEqual([{ id: 'ws-a', name: 'A' }]);
	});

	test('setReferences does not write when nothing changes', async () => {
		globalValue = { 'shapes/x.ttl': { encoding: 'plain', content: 'x', references: [{ id: 'ws-a', name: 'A' }] } };

		const store = new SettingsFileStore('files');

		await store.setReferences({ 'shapes/x.ttl': [{ id: 'ws-a', name: 'A' }] });

		expect(updates).toHaveLength(0);
	});

	test('caches the backing map between changes instead of re-inspecting per read', () => {
		globalValue = { 'shapes/x.ttl': { encoding: 'plain', content: 'x' } };

		let inspects = 0;

		(vscode.workspace as any).getConfiguration = () => ({
			inspect: (_key: string) => {
				inspects++;
				return { globalValue };
			},
			update: async (_key: string, value: any) => {
				globalValue = value;
				fireConfigurationChange();
			},
		});

		const store = new SettingsFileStore('files');
		const afterConstruction = inspects;

		// A change-free burst of reads — as in a reconcile or orphan scan over N
		// files — must not re-inspect (deep-clone) the map per call.
		for (let i = 0; i < 25; i++) {
			store.keys();
			store.has('shapes/x.ttl');
			store.getReferences('shapes/x.ttl');
		}

		expect(inspects).toBe(afterConstruction);

		// An external change invalidates the cache: the next read re-inspects.
		globalValue = { 'shapes/x.ttl': { encoding: 'plain', content: 'y' } };
		fireConfigurationChange();

		const afterChange = inspects;

		expect(store.keys()).toEqual(['shapes/x.ttl']);
		expect(inspects).toBe(afterChange);
		expect(afterChange).toBeGreaterThan(afterConstruction);
	});
});
