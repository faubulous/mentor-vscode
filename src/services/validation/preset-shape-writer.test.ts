import { describe, expect, test, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { writePresetShapes } from '@src/services/validation/preset-shape-writer';
import { getPresetShapeSource } from '@src/services/validation/presets';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@src/utilities/vscode/config', () => ({
	getShapesFolder: () => '.mentor/shapes',
}));

describe('writePresetShapes', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(vscode.workspace as any).workspaceFolders = [{ uri: vscode.Uri.parse('file:///w'), name: 'w', index: 0 }];
		(vscode.workspace.fs as any).readFile = async () => { throw new Error('not found'); };
		(vscode.workspace.fs as any).writeFile = async () => { };
	});

	test('writes the preset shapes to a version-suffixed name and returns the canonical workspace URI', async () => {
		const writes: { uri: vscode.Uri; content: Uint8Array }[] = [];
		(vscode.workspace.fs as any).writeFile = async (uri: vscode.Uri, content: Uint8Array) => { writes.push({ uri, content }); };

		const result = await writePresetShapes('ontology');

		expect(result).toEqual({ uri: 'workspace:///.mentor/shapes/ontology-1.0.shape.ttl', reused: false });
		expect(writes).toHaveLength(1);
		expect(new TextDecoder().decode(writes[0].content)).toBe(getPresetShapeSource('ontology'));
	});

	test('reuses an existing identical copy without rewriting it', async () => {
		(vscode.workspace.fs as any).readFile = async () => new TextEncoder().encode(getPresetShapeSource('ontology')!);
		const writeSpy = vi.fn();
		(vscode.workspace.fs as any).writeFile = writeSpy;

		const result = await writePresetShapes('ontology');

		expect(result).toEqual({ uri: 'workspace:///.mentor/shapes/ontology-1.0.shape.ttl', reused: true });
		expect(writeSpy).not.toHaveBeenCalled();
	});

	test('picks a numbered name when a different file already occupies the path', async () => {
		// The first path holds different content; the -2 path is free.
		(vscode.workspace.fs as any).readFile = async (uri: vscode.Uri) =>
			uri.path.endsWith('ontology-1.0.shape.ttl')
				? new TextEncoder().encode('# a different, user-edited shape file')
				: (() => { throw new Error('not found'); })();

		const result = await writePresetShapes('ontology');

		expect(result).toEqual({ uri: 'workspace:///.mentor/shapes/ontology-1.0-2.shape.ttl', reused: false });
	});

	test('throws for an unknown preset', async () => {
		await expect(writePresetShapes('nope')).rejects.toThrow(/Unknown validation preset/);
	});

	test('throws when no workspace folder is open', async () => {
		(vscode.workspace as any).workspaceFolders = undefined;

		await expect(writePresetShapes('ontology')).rejects.toThrow(/workspace folder/);
	});
});
