import * as vscode from 'vscode';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { getShapesFolder } from '@src/utilities/vscode/config';
import { getPresetShapeSource } from './presets';

/**
 * The result of materializing a preset shape graph into the workspace.
 */
export interface MaterializedShapes {
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
 * created from a template validates against a frozen, version-controlled copy
 * rather than the bundled graph (which may change in a future Mentor release).
 *
 * The file is written to `<shapesFolder>/<templateId>.shape.ttl` (see the
 * `mentor.shacl.shapesFolder` setting). When a file already exists at that path,
 * an identical one is reused; a different one causes a numeric suffix (`-2`, `-3`,
 * …) to be chosen so an existing, possibly edited, copy is never overwritten.
 *
 * @param templateId The built-in template id (e.g. `'basic-ontology'`).
 * @returns The canonical workspace URI of the shape file and whether it was reused.
 * @throws When the template is unknown or no workspace folder is open.
 */
export async function materializeTemplateShapes(templateId: string): Promise<MaterializedShapes> {
	const source = getPresetShapeSource(templateId);

	if (source === undefined) {
		throw new Error(`Unknown validation template: ${templateId}`);
	}

	const root = WorkspaceUri.getEffectiveRootUri();

	if (!root) {
		throw new Error('Open a workspace folder to copy the shapes into it.');
	}

	const folder = getShapesFolder();
	const bytes = new TextEncoder().encode(source);

	const target = await resolveTargetUri(root, folder, templateId, source);
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
 * `<templateId>.shape.ttl` when free or already holding identical content (reused),
 * otherwise the first free `<templateId>-N.shape.ttl`.
 */
async function resolveTargetUri(
	root: vscode.Uri,
	folder: string,
	templateId: string,
	source: string
): Promise<{ uri: vscode.Uri; reused: boolean }> {
	for (let index = 1; ; index++) {
		const name = index === 1 ? `${templateId}.shape.ttl` : `${templateId}-${index}.shape.ttl`;
		const uri = vscode.Uri.joinPath(root, folder, name);
		const existing = await readIfExists(uri);

		if (existing === undefined) {
			return { uri, reused: false };
		}

		if (existing === source) {
			// An identical copy already exists — reuse it rather than duplicating.
			return { uri, reused: true };
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
