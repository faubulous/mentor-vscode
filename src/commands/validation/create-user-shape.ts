import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { SettingsFileStore } from '@src/services/core';
import { UserUri } from '@src/providers/user-uri';
import { USER_SHAPES_FOLDER } from '@src/services/validation/shape-graph-service';

/**
 * The content a newly created user shape file is seeded with.
 */
const SHAPE_SKELETON = `@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix ex: <http://example.org/> .

# Example node shape — adapt it to your model:
#
# ex:PersonShape
#     a sh:NodeShape ;
#     sh:targetClass ex:Person ;
#     sh:property [
#         sh:path ex:name ;
#         sh:datatype xsd:string ;
#         sh:minCount 1 ;
#     ] .
`;

/**
 * The file extensions a user shape file may have, mapped to the loaders of the
 * RDF store (`.ttl`/`.nt` → Turtle, `.nq` → N-Quads).
 */
const ALLOWED_EXTENSIONS = ['.ttl', '.nt', '.nq'];

/**
 * Appends the default `.ttl` extension when the name carries none of the
 * supported ones.
 */
export function withDefaultShapeExtension(fileName: string): string {
	return ALLOWED_EXTENSIONS.some(extension => fileName.endsWith(extension)) ? fileName : `${fileName}.ttl`;
}

/**
 * Validates a user shape file name for the input box: a plain file name with a
 * supported RDF extension that does not collide with an existing entry.
 * @returns An error message, or undefined when the name is valid.
 */
export function validateUserShapeFileName(value: string, files: SettingsFileStore): string | undefined {
	const name = value.trim();

	if (name.length === 0) {
		return 'A file name is required.';
	}

	if (/[/\\]/.test(name) || name.includes('..')) {
		return 'Enter a plain file name without path segments.';
	}

	const withExtension = withDefaultShapeExtension(name);
	const extension = withExtension.slice(withExtension.lastIndexOf('.'));

	if (!ALLOWED_EXTENSIONS.includes(extension)) {
		return `Supported file extensions: ${ALLOWED_EXTENSIONS.join(', ')}.`;
	}

	if (files.has(`${USER_SHAPES_FOLDER}/${withExtension}`)) {
		return `A user shape file named '${withExtension}' already exists.`;
	}

	return undefined;
}

/**
 * Prompts for a file name, creates a new user shape file seeded with a SHACL
 * skeleton in the user settings (`mentor.files`, under the `shapes/` path) and
 * opens it in an editor beside the active one. Saving the editor updates the
 * settings entry; the shape graph service loads it into the store on reference.
 * @returns The canonical `user:///` graph URI of the created file, or
 * `undefined` when the prompt was dismissed.
 */
export async function createUserShapeFile(): Promise<string | undefined> {
	const files = container.resolve<SettingsFileStore>(ServiceToken.UserFileStore);

	const input = await vscode.window.showInputBox({
		title: 'New User Shape File',
		prompt: 'The file is stored in your user settings, synced via Settings Sync and available in every workspace.',
		value: 'shapes.ttl',
		validateInput: value => validateUserShapeFileName(value, files),
	});

	if (!input) {
		return undefined;
	}

	const path = `${USER_SHAPES_FOLDER}/${withDefaultShapeExtension(input.trim())}`;

	await files.write(path, SHAPE_SKELETON);

	const uri = UserUri.forPath(path);
	const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));

	await vscode.window.showTextDocument(document, { preview: false, viewColumn: vscode.ViewColumn.Beside });

	return uri;
}

export const createUserShape = {
	id: 'mentor.command.createUserShape',
	handler: async () => {
		await createUserShapeFile();
	}
};
