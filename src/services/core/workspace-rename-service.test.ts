import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import * as vscode from 'vscode';
import { Range } from 'vscode-languageserver-types';
import { WorkspaceRenameService } from '@src/services/core/workspace-rename-service';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { createMockDocumentContext, createRangeIndex, getTextEdits } from '@src/utilities/mocks/factories';

const IRI = 'http://example.org/ns#Thing';
const ORIGIN = vscode.Uri.parse('file:///w/ontology.ttl');

let files: Record<string, string>;
let openDocuments: { uri: vscode.Uri; getText: () => string }[];
let renameAcrossFiles: boolean;
let originalReadFile: typeof vscode.workspace.fs.readFile;
let originalGetConfiguration: typeof vscode.workspace.getConfiguration;

/**
 * Creates a context that references the IRI at the given ranges.
 */
function makeContext(uri: string, ranges: Range[], overrides: Partial<IDocumentContext> = {}): IDocumentContext {
	return createMockDocumentContext({
		uri: vscode.Uri.parse(uri),
		references: createRangeIndex({ [IRI]: ranges }),
		...overrides,
	});
}

/**
 * Runs the service over the given contexts and returns the edit it filled.
 */
async function rename(contexts: IDocumentContext[], newLocalPart = 'Entity', iri = IRI) {
	const contextService = { contexts: Object.fromEntries(contexts.map(c => [c.uri.toString(), c])) } as any;
	const edit = new vscode.WorkspaceEdit();
	const count = await new WorkspaceRenameService(contextService).addEditsInOtherFiles(edit, iri, newLocalPart, ORIGIN);

	return { edit, count, edits: getTextEdits(edit) };
}

beforeEach(() => {
	files = {};
	openDocuments = [];
	renameAcrossFiles = true;
	originalReadFile = vscode.workspace.fs.readFile;
	originalGetConfiguration = vscode.workspace.getConfiguration;

	(vscode.workspace.fs as any).readFile = vi.fn(async (uri: vscode.Uri) => {
		const content = files[uri.toString()];

		if (content === undefined) {
			throw new Error('file not found');
		}

		return new TextEncoder().encode(content);
	});

	(vscode.workspace as any).textDocuments = openDocuments;
	(vscode.workspace as any).getConfiguration = vi.fn(() => ({
		get: (key: string, defaultValue?: unknown) => key === 'editor.renameAcrossFiles' ? renameAcrossFiles : defaultValue,
	}));
});

afterEach(() => {
	(vscode.workspace.fs as any).readFile = originalReadFile;
	(vscode.workspace as any).getConfiguration = originalGetConfiguration;
	(vscode.workspace as any).textDocuments = [];
});

describe('WorkspaceRenameService', () => {
	it('renames the local part of every occurrence in a closed file', async () => {
		files['file:///w/data.ttl'] = 'ex:a a ex:Thing .\nex:b a <http://example.org/ns#Thing> .';

		const { count, edits } = await rename([makeContext('file:///w/data.ttl', [Range.create(0, 7, 0, 15), Range.create(1, 7, 1, 36)])]);

		expect(count).toBe(2);
		expect(edits.map(e => [e.uri.toString(), e.range.start.line, e.range.start.character, e.range.end.character, e.newText])).toEqual([
			['file:///w/data.ttl', 0, 10, 15, 'Entity'],
			['file:///w/data.ttl', 1, 30, 35, 'Entity'],
		]);
	});

	it('marks every edit as needing confirmation', async () => {
		files['file:///w/data.ttl'] = 'ex:a a ex:Thing .';

		const { edit } = await rename([makeContext('file:///w/data.ttl', [Range.create(0, 7, 0, 15)])]);
		const [[, textEdits]] = edit.entries();

		expect((textEdits[0] as any).metadata).toMatchObject({ needsConfirmation: true, label: 'Rename in other files' });
	});

	it('adds no edits when the setting is disabled', async () => {
		renameAcrossFiles = false;
		files['file:///w/data.ttl'] = 'ex:a a ex:Thing .';

		const { count } = await rename([makeContext('file:///w/data.ttl', [Range.create(0, 7, 0, 15)])]);

		expect(count).toBe(0);
		expect(vscode.workspace.fs.readFile).not.toHaveBeenCalled();
	});

	it('adds no edits for an IRI without a local part', async () => {
		const namespace = 'http://example.org/ns#';
		const context = createMockDocumentContext({ uri: vscode.Uri.parse('file:///w/data.ttl'), references: createRangeIndex({ [namespace]: [Range.create(0, 0, 0, 3)] }) });

		const { count } = await rename([context], 'Entity', namespace);

		expect(count).toBe(0);
	});

	it('skips the origin document, temporary contexts and read-only file systems', async () => {
		const range = Range.create(0, 7, 0, 15);

		const { count } = await rename([
			makeContext(ORIGIN.toString(), [range]),
			makeContext('file:///w/diff.ttl', [range], { isTemporary: true }),
			makeContext('git:/w/data.ttl', [range]),
		]);

		expect(count).toBe(0);
		expect(vscode.workspace.fs.readFile).not.toHaveBeenCalled();
	});

	it('uses the text of an open document, including unsaved changes', async () => {
		files['file:///w/data.ttl'] = 'stale content on disk';
		openDocuments.push({ uri: vscode.Uri.parse('file:///w/data.ttl'), getText: () => 'ex:a a ex:Thing .' });

		const { count } = await rename([makeContext('file:///w/data.ttl', [Range.create(0, 7, 0, 15)])]);

		expect(count).toBe(1);
		expect(vscode.workspace.fs.readFile).not.toHaveBeenCalled();
	});

	it('skips files that cannot be read and still renames in the others', async () => {
		files['file:///w/data.ttl'] = 'ex:a a ex:Thing .';

		const { edits } = await rename([
			makeContext('file:///w/missing.ttl', [Range.create(0, 7, 0, 15)]),
			makeContext('file:///w/data.ttl', [Range.create(0, 7, 0, 15)]),
		]);

		expect(edits.map(e => e.uri.toString())).toEqual(['file:///w/data.ttl']);
	});

	it('skips notebook cells and untitled documents that are not open', async () => {
		const range = Range.create(0, 7, 0, 15);

		const { count } = await rename([
			makeContext('vscode-notebook-cell:/w/queries.mnb#W0sZmlsZQ%3D%3D', [range]),
			makeContext('untitled:Untitled-1', [range]),
		]);

		expect(count).toBe(0);
	});

	it('skips stale ranges whose text no longer shows the local part', async () => {
		files['file:///w/data.ttl'] = 'ex:a a ex:Other .';

		const { count } = await rename([makeContext('file:///w/data.ttl', [Range.create(0, 7, 0, 15)])]);

		expect(count).toBe(0);
	});

	it('edits a duplicated range only once', async () => {
		files['file:///w/data.ttl'] = 'ex:a a ex:Thing .';

		const range = Range.create(0, 7, 0, 15);
		const { count } = await rename([makeContext('file:///w/data.ttl', [range, range])]);

		expect(count).toBe(1);
	});

	it('renames the local part in RDF/XML attribute values and entity references', async () => {
		files['file:///w/data.rdf'] = '<rdf:Description rdf:about="http://example.org/ns#Thing"/>\n<rdf:type rdf:resource="&ns;Thing"/>';

		const { edits } = await rename([makeContext('file:///w/data.rdf', [Range.create(0, 28, 0, 55), Range.create(1, 24, 1, 33)])]);

		expect(edits.map(e => [e.range.start.line, e.range.start.character, e.range.end.character])).toEqual([
			[0, 50, 55],
			[1, 28, 33],
		]);
	});
});
