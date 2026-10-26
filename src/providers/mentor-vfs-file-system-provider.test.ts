import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { MentorVfsFileSystemProvider } from '@src/providers/mentor-vfs-file-system-provider';
import { MentorVfsUri } from '@src/providers/mentor-vfs-uri';
import { PRESET_GRAPHS } from '@src/services/core/preset-graphs';
import { NotSupportedError } from '@src/utilities/error';

describe('MentorVfsFileSystemProvider', () => {
	const rdfs = PRESET_GRAPHS.find(graph => graph.path === 'vocabularies/rdfs.ttl')!;
	const unknownUri = vscode.Uri.parse('mentor-vfs:/vocabularies/unknown.ttl');

	let subscriptions: vscode.Disposable[];
	let provider: MentorVfsFileSystemProvider;

	beforeEach(() => {
		subscriptions = [];
		provider = new MentorVfsFileSystemProvider({ subscriptions } as any);
	});

	it('registers itself as a read-only file system for the mentor-vfs scheme', () => {
		const register = vi.spyOn(vscode.workspace, 'registerFileSystemProvider');

		new MentorVfsFileSystemProvider({ subscriptions } as any);

		expect(register).toHaveBeenCalledWith('mentor-vfs', expect.anything(), { isCaseSensitive: true, isReadonly: true });
		expect(subscriptions).toHaveLength(2);
	});

	it('reads the source of a preset graph', () => {
		const content = new TextDecoder().decode(provider.readFile(MentorVfsUri.toUri(rdfs)));

		expect(content).toBe(rdfs.source);
	});

	it('reports a file with the size of the source', () => {
		const stat = provider.stat(MentorVfsUri.toUri(rdfs));

		expect(stat.type).toBe(vscode.FileType.File);
		expect(stat.size).toBe(new TextEncoder().encode(rdfs.source).length);
	});

	it('reports a missing file for an unknown path', () => {
		expect(() => provider.readFile(unknownUri)).toThrow(expect.objectContaining({ code: 'FileNotFound' }));
		expect(() => provider.stat(unknownUri)).toThrow(expect.objectContaining({ code: 'FileNotFound' }));
	});

	it('does not support changes', () => {
		expect(() => provider.writeFile()).toThrow(NotSupportedError);
		expect(() => provider.createDirectory()).toThrow(NotSupportedError);
		expect(() => provider.delete()).toThrow(NotSupportedError);
		expect(() => provider.rename()).toThrow(NotSupportedError);
	});
});
