import { describe, expect, test, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { SettingsFileStore, SettingsFileEntry } from '@src/services/core';
import { UserFileSystemProvider } from '@src/providers/user-file-system-provider';

/**
 * In-memory stand-in for the user-level `mentor.shacl.shapes` value; the fake
 * `update` fires the configuration-change listeners like the real host.
 */
let globalValue: Record<string, SettingsFileEntry> | undefined;
let listeners: Array<(e: vscode.ConfigurationChangeEvent) => void>;

function fireConfigurationChange(): void {
	for (const listener of [...listeners]) {
		listener({ affectsConfiguration: (section: string) => section === 'mentor.shacl.shapes' } as vscode.ConfigurationChangeEvent);
	}
}

function createProvider(): { provider: UserFileSystemProvider; store: SettingsFileStore } {
	const store = new SettingsFileStore('shacl.shapes');

	UserFileSystemProvider.registerFolder('/shapes', store);

	const context = { subscriptions: [] as vscode.Disposable[] } as vscode.ExtensionContext;

	return { provider: new UserFileSystemProvider(context), store };
}

const uri = (path: string) => vscode.Uri.parse(`user://${path.startsWith('/') ? '' : '/'}${path}`);

beforeEach(() => {
	globalValue = undefined;
	listeners = [];

	(vscode.workspace as any).getConfiguration = () => ({
		inspect: (_key: string) => ({ globalValue }),
		update: async (_key: string, value: any) => {
			globalValue = value;
			fireConfigurationChange();
		},
	});

	(vscode.workspace as any).onDidChangeConfiguration = (handler: any) => {
		listeners.push(handler);
		return { dispose: () => listeners.splice(listeners.indexOf(handler), 1) };
	};
});

describe('UserFileSystemProvider', () => {
	test('round-trips a file through writeFile and readFile', async () => {
		const { provider } = createProvider();

		await provider.writeFile(uri('/shapes/my.ttl'), new TextEncoder().encode('<a> a <b> .'));

		expect(new TextDecoder().decode(await provider.readFile(uri('/shapes/my.ttl')))).toBe('<a> a <b> .');
		expect(globalValue!['my.ttl'].encoding).toBe('gzip+base64');
	});

	test('stats files with their decoded size and directories for the root and folders', async () => {
		const { provider } = createProvider();

		await provider.writeFile(uri('/shapes/my.ttl'), new TextEncoder().encode('<a> a <b> .'));

		const file = await provider.stat(uri('/shapes/my.ttl'));
		expect(file.type).toBe(vscode.FileType.File);
		expect(file.size).toBe('<a> a <b> .'.length);
		expect(file.mtime).toBeGreaterThan(0);

		expect((await provider.stat(uri('/'))).type).toBe(vscode.FileType.Directory);
		expect((await provider.stat(uri('/shapes'))).type).toBe(vscode.FileType.Directory);
	});

	test('throws FileNotFound for missing entries and unregistered folders', async () => {
		const { provider } = createProvider();

		await expect(provider.readFile(uri('/shapes/ghost.ttl'))).rejects.toMatchObject({ code: 'FileNotFound' });
		await expect(provider.stat(uri('/shapes/ghost.ttl'))).rejects.toMatchObject({ code: 'FileNotFound' });
		await expect(provider.readFile(uri('/other/x.ttl'))).rejects.toMatchObject({ code: 'FileNotFound' });
		await expect(provider.delete(uri('/shapes/ghost.ttl'))).rejects.toMatchObject({ code: 'FileNotFound' });
	});

	test('lists registered folders at the root and entries inside a folder', async () => {
		const { provider } = createProvider();

		await provider.writeFile(uri('/shapes/a.ttl'), new TextEncoder().encode('<a> a <x> .'));
		await provider.writeFile(uri('/shapes/b.ttl'), new TextEncoder().encode('<b> a <x> .'));

		expect(provider.readDirectory(uri('/'))).toContainEqual(['shapes', vscode.FileType.Directory]);
		expect(provider.readDirectory(uri('/shapes')).sort()).toEqual([
			['a.ttl', vscode.FileType.File],
			['b.ttl', vscode.FileType.File],
		]);
	});

	test('delete removes the settings entry', async () => {
		const { provider, store } = createProvider();

		await provider.writeFile(uri('/shapes/a.ttl'), new TextEncoder().encode('<a> a <x> .'));
		await provider.delete(uri('/shapes/a.ttl'));

		expect(store.has('a.ttl')).toBe(false);
		expect(globalValue).toBeUndefined();
	});

	test('rename moves the entry within the folder', async () => {
		const { provider } = createProvider();

		await provider.writeFile(uri('/shapes/old.ttl'), new TextEncoder().encode('<a> a <x> .'));
		await provider.rename(uri('/shapes/old.ttl'), uri('/shapes/new.ttl'));

		expect(new TextDecoder().decode(await provider.readFile(uri('/shapes/new.ttl')))).toBe('<a> a <x> .');
		await expect(provider.readFile(uri('/shapes/old.ttl'))).rejects.toMatchObject({ code: 'FileNotFound' });
	});

	test('surfaces the size gate as an Unavailable file system error', async () => {
		const store = new SettingsFileStore('shacl.shapes', { maxEntryLength: 16 });
		UserFileSystemProvider.registerFolder('/shapes', store);
		const provider = new UserFileSystemProvider({ subscriptions: [] } as any);

		const content = new TextEncoder().encode('x'.repeat(10_000) + Math.random());

		await expect(provider.writeFile(uri('/shapes/big.ttl'), content))
			.rejects.toMatchObject({ code: 'Unavailable', message: expect.stringMatching(/too large/) });
	});

	test('relays store changes as file change events with canonical user URIs', async () => {
		const { provider } = createProvider();
		const events: vscode.FileChangeEvent[][] = [];
		provider.onDidChangeFile(e => events.push([...e]));

		// Simulate a Settings Sync update arriving from another machine.
		globalValue = { 'synced.ttl': { encoding: 'plain', content: '<s> a <x> .' } };
		fireConfigurationChange();

		expect(events).toHaveLength(1);
		expect(events[0][0].type).toBe(vscode.FileChangeType.Created);
		expect(events[0][0].uri.path).toBe('/shapes/synced.ttl');
		expect(events[0][0].uri.scheme).toBe('user');
	});
});
