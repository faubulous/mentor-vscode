import { describe, expect, test, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { SettingsFileStore } from '@src/services/core';
import { SettingsFileEntry } from '@src/services/core/settings-file-store';
import { UserFileSystemProvider } from '@src/providers/user-file-system-provider';

/**
 * In-memory stand-in for the user-level `mentor.files` value; the fake `update`
 * fires the configuration-change listeners like the real host.
 */
let globalValue: Record<string, SettingsFileEntry> | undefined;
let listeners: Array<(e: vscode.ConfigurationChangeEvent) => void>;

function fireConfigurationChange(): void {
	for (const listener of [...listeners]) {
		listener({ affectsConfiguration: (section: string) => section === 'mentor.files' } as vscode.ConfigurationChangeEvent);
	}
}

function createProvider(options?: { maxEntryLength?: number }): { provider: UserFileSystemProvider; store: SettingsFileStore } {
	const store = new SettingsFileStore('files', options);
	const context = { subscriptions: [] as vscode.Disposable[] } as vscode.ExtensionContext;

	return { provider: new UserFileSystemProvider(context, store), store };
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
	test('round-trips a file through writeFile and readFile, keyed by its full path', async () => {
		const { provider } = createProvider();

		await provider.writeFile(uri('/shapes/my.ttl'), new TextEncoder().encode('<a> a <b> .'));

		expect(new TextDecoder().decode(await provider.readFile(uri('/shapes/my.ttl')))).toBe('<a> a <b> .');
		expect(globalValue!['shapes/my.ttl'].encoding).toBe('gzip+base64');
	});

	test('stats files with their decoded size and directories for the root and prefixes', async () => {
		const { provider } = createProvider();

		await provider.writeFile(uri('/shapes/my.ttl'), new TextEncoder().encode('<a> a <b> .'));

		const file = await provider.stat(uri('/shapes/my.ttl'));
		expect(file.type).toBe(vscode.FileType.File);
		expect(file.size).toBe('<a> a <b> .'.length);
		expect(file.mtime).toBeGreaterThan(0);

		expect((await provider.stat(uri('/'))).type).toBe(vscode.FileType.Directory);
		expect((await provider.stat(uri('/shapes'))).type).toBe(vscode.FileType.Directory);
	});

	test('synthesizes nested directories from key prefixes', async () => {
		const { provider } = createProvider();

		await provider.writeFile(uri('/shapes/core/base.ttl'), new TextEncoder().encode('<a> a <b> .'));

		// Both the intermediate `shapes` and `shapes/core` directories are implied.
		expect((await provider.stat(uri('/shapes'))).type).toBe(vscode.FileType.Directory);
		expect((await provider.stat(uri('/shapes/core'))).type).toBe(vscode.FileType.Directory);
		expect((await provider.stat(uri('/shapes/core/base.ttl'))).type).toBe(vscode.FileType.File);

		expect(provider.readDirectory(uri('/'))).toEqual([['shapes', vscode.FileType.Directory]]);
		expect(provider.readDirectory(uri('/shapes'))).toEqual([['core', vscode.FileType.Directory]]);
		expect(provider.readDirectory(uri('/shapes/core'))).toEqual([['base.ttl', vscode.FileType.File]]);
	});

	test('throws FileNotFound for missing entries and unknown directories', async () => {
		const { provider } = createProvider();

		await provider.writeFile(uri('/shapes/my.ttl'), new TextEncoder().encode('<a> a <b> .'));

		await expect(provider.readFile(uri('/shapes/ghost.ttl'))).rejects.toMatchObject({ code: 'FileNotFound' });
		await expect(provider.stat(uri('/shapes/ghost.ttl'))).rejects.toMatchObject({ code: 'FileNotFound' });
		await expect(provider.stat(uri('/other'))).rejects.toMatchObject({ code: 'FileNotFound' });
		await expect(provider.delete(uri('/shapes/ghost.ttl'))).rejects.toMatchObject({ code: 'FileNotFound' });
	});

	test('lists top-level directories at the root and entries inside a directory', async () => {
		const { provider } = createProvider();

		await provider.writeFile(uri('/shapes/a.ttl'), new TextEncoder().encode('<a> a <x> .'));
		await provider.writeFile(uri('/shapes/b.ttl'), new TextEncoder().encode('<b> a <x> .'));
		await provider.writeFile(uri('/queries/q.rq'), new TextEncoder().encode('SELECT * {}'));

		expect(provider.readDirectory(uri('/')).sort()).toEqual([
			['queries', vscode.FileType.Directory],
			['shapes', vscode.FileType.Directory],
		]);
		expect(provider.readDirectory(uri('/shapes')).sort()).toEqual([
			['a.ttl', vscode.FileType.File],
			['b.ttl', vscode.FileType.File],
		]);
	});

	test('delete removes the settings entry', async () => {
		const { provider, store } = createProvider();

		await provider.writeFile(uri('/shapes/a.ttl'), new TextEncoder().encode('<a> a <x> .'));
		await provider.delete(uri('/shapes/a.ttl'));

		expect(store.has('shapes/a.ttl')).toBe(false);
		expect(globalValue).toBeUndefined();
	});

	test('rename moves the entry, including across folders', async () => {
		const { provider } = createProvider();

		await provider.writeFile(uri('/shapes/old.ttl'), new TextEncoder().encode('<a> a <x> .'));
		await provider.rename(uri('/shapes/old.ttl'), uri('/archive/new.ttl'));

		expect(new TextDecoder().decode(await provider.readFile(uri('/archive/new.ttl')))).toBe('<a> a <x> .');
		await expect(provider.readFile(uri('/shapes/old.ttl'))).rejects.toMatchObject({ code: 'FileNotFound' });
	});

	test('surfaces the size gate as an Unavailable file system error', async () => {
		const { provider } = createProvider({ maxEntryLength: 16 });

		const content = new TextEncoder().encode('x'.repeat(10_000) + Math.random());

		await expect(provider.writeFile(uri('/shapes/big.ttl'), content))
			.rejects.toMatchObject({ code: 'Unavailable', message: expect.stringMatching(/too large/) });
	});

	test('relays store changes as file change events with canonical user URIs', async () => {
		const { provider } = createProvider();
		const events: vscode.FileChangeEvent[][] = [];
		provider.onDidChangeFile(e => events.push([...e]));

		// Simulate a Settings Sync update arriving from another machine.
		globalValue = { 'shapes/synced.ttl': { encoding: 'plain', content: '<s> a <x> .' } };
		fireConfigurationChange();

		expect(events).toHaveLength(1);
		expect(events[0][0].type).toBe(vscode.FileChangeType.Created);
		expect(events[0][0].uri.path).toBe('/shapes/synced.ttl');
		expect(events[0][0].uri.scheme).toBe('user');
	});
});
