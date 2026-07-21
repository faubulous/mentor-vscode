import * as vscode from 'vscode';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { getShapesFolder } from '@src/utilities/vscode/config';
import { VALIDATION_PRESETS } from './preset-definitions';
import { getPresetShapeSource } from './presets';

/**
 * The result of writing a preset shape graph into the workspace.
 */
export interface WrittenPresetShapes {
	/**
	 * The canonical `workspace:///` URI of the written shape file, to store in a
	 * profile's `shapes[]`.
	 */
	uri: string;

	/**
	 * `true` when an existing, identical file was reused instead of writing a new one.
	 */
	reused: boolean;
}

/**
 * Writes a copy of a built-in preset shape graph into the workspace so a profile
 * created from a preset validates against a frozen, version-controlled copy
 * rather than the bundled graph (which may change in a future Mentor release).
 *
 * The file is written to `<shapesFolder>/<presetId>-<version>.shape.ttl` (see the
 * `mentor.shacl.shapesFolder` setting), mirroring the bundled source's file name —
 * the version in the name ties the frozen copy to the shape graph release it was
 * taken from. When a file already exists at that path, an identical one is reused.
 * A different one (edited, or written by an older Mentor release) is never
 * overwritten: the user is asked whether to reuse the existing copy or keep both,
 * in which case a numeric suffix (`-2`, `-3`, …) is chosen for the new file.
 *
 * @param presetId The built-in preset id (e.g. `'ontology'`).
 * @returns The canonical workspace URI of the shape file and whether it was reused.
 * @throws When the preset is unknown or no workspace folder is open.
 */
export async function writePresetShapes(presetId: string): Promise<WrittenPresetShapes> {
	const source = getPresetShapeSource(presetId);

	if (source === undefined) {
		throw new Error(`Unknown validation preset: ${presetId}`);
	}

	const root = WorkspaceUri.getEffectiveRootUri();

	if (!root) {
		throw new Error('Open a workspace folder to copy the shapes into it.');
	}

	const folder = getShapesFolder();
	const bytes = new TextEncoder().encode(source);

	const version = VALIDATION_PRESETS.find(p => p.id === presetId)?.version;
	const baseName = version ? `${presetId}-${version}` : presetId;

	const target = await resolveTargetUri(root, folder, presetId, baseName, source);
	const workspaceUri = WorkspaceUri.toWorkspaceUri(target.uri);

	if (!workspaceUri) {
		throw new Error('Could not resolve a workspace URI for the shapes file.');
	}

	if (!target.reused) {
		await vscode.workspace.fs.writeFile(target.uri, bytes);
	}

	return { uri: workspaceUri.toString(), reused: target.reused };
}

/**
 * Picks the file URI to write the shapes to under `<folder>`: the plain
 * `<baseName>.shape.ttl` when free or already holding identical content (reused).
 * When it holds different content (edited, or from an older Mentor release), the
 * user chooses between reusing that copy and keeping both; keeping both picks
 * the first free `<baseName>-N.shape.ttl`.
 */
async function resolveTargetUri(
	root: vscode.Uri,
	folder: string,
	presetId: string,
	baseName: string,
	source: string
): Promise<{ uri: vscode.Uri; reused: boolean }> {
	for (let index = 1; ; index++) {
		const name = index === 1 ? `${baseName}.shape.ttl` : `${baseName}-${index}.shape.ttl`;
		const uri = vscode.Uri.joinPath(root, folder, name);
		const existing = await readIfExists(uri);

		if (existing === undefined) {
			return { uri, reused: false };
		}

		if (existing === source) {
			// An identical copy already exists — reuse it rather than duplicating.
			return { uri, reused: true };
		}

		if (index === 1) {
			// The primary copy differs from the current built-in shapes — it was
			// either edited or written by an older Mentor release. Never overwrite
			// it; ask whether to validate against it or write a fresh copy next to
			// it. Dismissing the prompt keeps both (the non-destructive default).
			const action = await vscode.window.showWarningMessage(
				`A copy of the "${presetId}" shapes already exists in the workspace (${folder}/${name}) but differs from the current built-in version — `
				+ 'it may have been edited, or come from an older Mentor release.',
				'Use Existing Copy',
				'Keep Both'
			);

			if (action === 'Use Existing Copy') {
				return { uri, reused: true };
			}
		}
	}
}

/**
 * Reads a file as UTF-8 text, returning `undefined` when it does not exist.
 */
async function readIfExists(uri: vscode.Uri): Promise<string | undefined> {
	try {
		const bytes = await vscode.workspace.fs.readFile(uri);

		return new TextDecoder().decode(bytes);
	} catch {
		return undefined;
	}
}
