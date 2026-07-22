import { describe, expect, test, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { SettingsFileStore, SettingsFileChangeEvent, SettingsFileEntry } from '@src/services/core/settings-file-store';
import { compressToBase64 } from '@src/utilities/compression';

/**
 * In-memory stand-in for the user-level `mentor.shacl.shapes` value. The fake
 * `update` mirrors the real host by firing the configuration-change listeners
 * after a write.
 */
let globalValue: Record<string, SettingsFileEntry> | undefined;
let updates: { key: string; value: unknown; target: number }[];
let listeners: Array<(e: vscode.ConfigurationChangeEvent) => void>;

function fireConfigurationChange(): void {
	for (const listener of [...listeners]) {
		listener({ affectsConfiguration: (section: string) => section === 'mentor.shacl.shapes' } as vscode.ConfigurationChangeEvent);
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
		const store = new SettingsFileStore('shacl.shapes');

		await store.write('my-shapes.ttl', '<a> a <b> .');

		expect(updates).toHaveLength(1);
		expect(updates[0].target).toBe(vscode.ConfigurationTarget.Global);
		expect(globalValue!['my-shapes.ttl'].encoding).toBe('gzip+base64');
		expect(globalValue!['my-shapes.ttl'].content).not.toContain('<a>');

		expect(await store.read('my-shapes.ttl')).toBe('<a> a <b> .');
	});

	test('read tolerates plain entries', async () => {
		globalValue = { 'hand-edited.ttl': { encoding: 'plain', content: '<x> a <y> .' } };

		const store = new SettingsFileStore('shacl.shapes');

		expect(await store.read('hand-edited.ttl')).toBe('<x> a <y> .');
	});

	test('read throws for a missing entry', async () => {
		const store = new SettingsFileStore('shacl.shapes');

		await expect(store.read('nope.ttl')).rejects.toThrow(/nope\.ttl/);
	});

	test('write preserves sibling entries', async () => {
		globalValue = { 'other.ttl': { encoding: 'plain', content: '<o> a <k> .' } };

		const store = new SettingsFileStore('shacl.shapes');

		await store.write('new.ttl', '<n> a <e> .');

		expect(Object.keys(globalValue!).sort()).toEqual(['new.ttl', 'other.ttl']);
		expect(await store.read('other.ttl')).toBe('<o> a <k> .');
	});

	test('deleting the last entry clears the settings key', async () => {
		globalValue = { 'only.ttl': { encoding: 'plain', content: '<a> a <b> .' } };

		const store = new SettingsFileStore('shacl.shapes');

		await store.delete('only.ttl');

		expect(updates[0].value).toBeUndefined();
		expect(store.keys()).toEqual([]);
	});

	test('rejects entries exceeding the size gate without writing', async () => {
		const store = new SettingsFileStore('shacl.shapes', { maxEntryLength: 16 });

		await expect(store.write('big.ttl', 'x'.repeat(10_000) + Math.random())).rejects.toThrow(/too large/);
		expect(updates).toHaveLength(0);
	});

	test('rename keeps the stored content and rejects missing sources', async () => {
		const encoded = await compressToBase64('<a> a <b> .');
		globalValue = { 'old.ttl': { encoding: 'gzip+base64', content: encoded } };

		const store = new SettingsFileStore('shacl.shapes');

		await store.rename('old.ttl', 'new.ttl');

		expect(store.has('old.ttl')).toBe(false);
		expect(await store.read('new.ttl')).toBe('<a> a <b> .');

		await expect(store.rename('ghost.ttl', 'x.ttl')).rejects.toThrow(/ghost\.ttl/);
	});

	test('reports created, changed and deleted keys on external value changes', async () => {
		const store = new SettingsFileStore('shacl.shapes');
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
		const store = new SettingsFileStore('shacl.shapes');

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

		const store = new SettingsFileStore('shacl.shapes');
		const events: SettingsFileChangeEvent[] = [];
		store.onDidChangeEntries(e => events.push(e));

		fireConfigurationChange();

		expect(events).toEqual([]);
	});

	test('serializes concurrent writes so no entry is lost', async () => {
		const store = new SettingsFileStore('shacl.shapes');

		await Promise.all([
			store.write('a.ttl', '<a> a <x> .'),
			store.write('b.ttl', '<b> a <x> .'),
			store.write('c.ttl', '<c> a <x> .'),
		]);

		expect(store.keys().sort()).toEqual(['a.ttl', 'b.ttl', 'c.ttl']);
	});
});
