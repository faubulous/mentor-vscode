import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { MentorE2eState, activateMentor, getMentorState, waitFor, waitForIndexing } from '../helpers';

const TURTLE = '@prefix ex: <http://example.org/> .\n\nex:subject a ex:Class .\n';

const SPARQL = 'SELECT * WHERE { ?s ?p ?o }\n';

/**
 * The folders the tests create in the fixture workspace.
 */
const CREATED_FOLDERS = ['old', 'src'];

/**
 * Gets the absolute path of a file or folder in the fixture workspace.
 * @param relativePath A workspace relative path.
 */
function getPath(relativePath: string): string {
	return path.join(vscode.workspace.workspaceFolders![0].uri.fsPath, relativePath);
}

/**
 * Gets the URI string of a file in the fixture workspace, as reported in the extension state.
 * @param relativePath A workspace relative path.
 */
function getUri(relativePath: string): string {
	return vscode.Uri.joinPath(vscode.workspace.workspaceFolders![0].uri, relativePath).toString();
}

/**
 * Writes a file into the fixture workspace with Node.js, i.e. outside of VS Code.
 * @param relativePath A workspace relative path.
 * @param content The file content.
 */
function writeFile(relativePath: string, content: string): void {
	fs.mkdirSync(path.dirname(getPath(relativePath)), { recursive: true });
	fs.writeFileSync(getPath(relativePath), content);
}

/**
 * Removes the folders created by the tests.
 */
function removeCreatedFolders(): void {
	for (const folder of CREATED_FOLDERS) {
		fs.rmSync(getPath(folder), { recursive: true, force: true });
	}
}

/**
 * Indicates whether any of the given URIs lies inside a folder of the fixture workspace.
 * @param uris The URIs to check.
 * @param folder A workspace relative folder path.
 */
function hasUriInFolder(uris: string[], folder: string): boolean {
	return uris.some(uri => uri.startsWith(getUri(folder) + '/'));
}

/**
 * Waits until the extension state satisfies a condition.
 * @param condition The condition on the extension state.
 * @param label A description of the condition for the timeout message.
 * @returns The extension state that satisfied the condition.
 */
function waitForState(condition: (state: MentorE2eState) => boolean, label: string): Promise<MentorE2eState> {
	return waitFor(async () => {
		const state = await getMentorState();

		return condition(state) ? state : undefined;
	}, { label, timeoutMs: 20000 }) as Promise<MentorE2eState>;
}

/**
 * Folders that are created, moved and deleted outside of VS Code, e.g. in a terminal or by
 * a version control checkout, must be reflected by the workspace file list and the index
 * (faubulous/mentor-vscode#95).
 */
suite('external folder changes', () => {
	let initialGraphCount: number;

	suiteSetup(async () => {
		removeCreatedFolders();

		await activateMentor();

		initialGraphCount = (await waitForIndexing()).workspaceGraphCount;
	});

	suiteTeardown(() => {
		removeCreatedFolders();
	});

	test('indexes the files of a folder that is created outside of VS Code', async () => {
		writeFile('old/data/data.ttl', TURTLE);
		writeFile('old/queries/query.sparql', SPARQL);

		const state = await waitForState(s => s.workspaceFiles.includes(getUri('old/data/data.ttl'))
			&& s.workspaceFiles.includes(getUri('old/queries/query.sparql'))
			&& s.documentContexts.includes(getUri('old/data/data.ttl')), 'the created files to be indexed');

		assert.ok(state.workspaceGraphCount > initialGraphCount, 'the created Turtle file must add graphs to the store');
	});

	test('follows a folder that is moved outside of VS Code', async () => {
		fs.mkdirSync(getPath('src'), { recursive: true });
		fs.renameSync(getPath('old'), getPath('src/new'));

		const state = await waitForState(s => !hasUriInFolder(s.workspaceFiles, 'old')
			&& s.workspaceFiles.includes(getUri('src/new/data/data.ttl'))
			&& s.workspaceFiles.includes(getUri('src/new/queries/query.sparql'))
			&& s.documentContexts.includes(getUri('src/new/data/data.ttl')), 'the moved files to be indexed');

		assert.ok(!hasUriInFolder(state.documentContexts, 'old'), 'the documents of the old folder must be removed from the index');
	});

	test('removes a folder that is deleted outside of VS Code', async () => {
		writeFile('src/new/data/data.ttl', TURTLE);

		await waitForState(s => s.documentContexts.includes(getUri('src/new/data/data.ttl')), 'the files to delete to be indexed');

		fs.rmSync(getPath('src'), { recursive: true, force: true });

		await waitForState(s => !hasUriInFolder(s.workspaceFiles, 'src')
			&& !hasUriInFolder(s.documentContexts, 'src')
			&& s.workspaceGraphCount === initialGraphCount, 'the deleted files to be removed from the index');
	});
});
