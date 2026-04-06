import * as vscode from 'vscode';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { cleanDocument } from './clean-document';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn(() => ({})) },
	injectable: () => (t: any) => t,
	inject: () => () => { },
	singleton: () => (t: any) => t,
}));

function createDocument(uri: string, diagnostics: any[] = []) {
	return {
		uri: {
			toString: () => uri,
			toJSON: () => ({ scheme: 'file', path: uri })
		},
		getText: vi.fn((_range?: any) => ''),
	};
}

beforeEach(() => {
	vi.clearAllMocks();

	(vscode.workspace as any).textDocuments = [];
	(vscode.window as any).activeTextEditor = undefined;

	vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined as any);
	vi.spyOn(vscode.workspace, 'applyEdit').mockResolvedValue(true);
});

afterEach(() => {
	(vscode.workspace as any).textDocuments = [];
	(vscode.window as any).activeTextEditor = undefined;
});

describe('cleanDocument', () => {
	it('should have the correct command id', () => {
		expect(cleanDocument.id).toBe('mentor.command.cleanDocument');
	});

	it('should show error when no documentUri and no active editor', async () => {
		const showError = vi.spyOn(vscode.window, 'showErrorMessage');

		await cleanDocument.handler(undefined);

		expect(showError).toHaveBeenCalledWith(expect.stringContaining('No document selected'));
	});

	it('should use documentUri when provided', async () => {
		const uri = 'file:///doc.ttl';
		const document = createDocument(uri);

		(vscode.workspace as any).textDocuments = [document];

		vi.spyOn(vscode.languages, 'getDiagnostics').mockReturnValue([]);

		await cleanDocument.handler(vscode.Uri.parse(uri));

		// No error — document was found
		expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
	});

	it('should use active editor URI when no documentUri passed', async () => {
		const uri = 'file:///editor.ttl';
		const document = createDocument(uri);

		(vscode.workspace as any).textDocuments = [document];
		(vscode.window as any).activeTextEditor = {
			document: { uri: { toString: () => uri } },
			options: { tabSize: 2, insertSpaces: true },
		};

		vi.spyOn(vscode.languages, 'getDiagnostics').mockReturnValue([]);

		await cleanDocument.handler(undefined);

		expect(vscode.window.showErrorMessage).not.toHaveBeenCalled();
	});

	it('should open the document if not already in textDocuments', async () => {
		const uri = 'file:///new.ttl';
		const document = createDocument(uri);

		(vscode.workspace as any).textDocuments = [];

		vi.spyOn(vscode.workspace as any, 'openTextDocument').mockResolvedValue(document);
		vi.spyOn(vscode.languages, 'getDiagnostics').mockReturnValue([]);

		const documentUri = vscode.Uri.parse(uri);

		await cleanDocument.handler(documentUri);

		expect(vscode.workspace.openTextDocument).toHaveBeenCalledWith(documentUri);
	});

	it('should call deletePrefixes command when unused prefix diagnostics are found', async () => {
		const uri = 'file:///prefixed.ttl';
		const document = {
			uri: { toString: () => uri },
			getText: vi.fn(() => '@prefix ex: <http://example/> .'),
		};

		(vscode.workspace as any).textDocuments = [document];

		const diagnostics = {
			code: 'UnusedNamespacePrefixHint',
			range: {
				start: { line: 0, character: 0 },
				end: { line: 0, character: 35 }
			},
			severity: 0,
		};

		vi.spyOn(vscode.languages, 'getDiagnostics').mockReturnValue([diagnostics as any]);

		const execSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined as any);
		const documentUri = vscode.Uri.parse(uri);

		await cleanDocument.handler(documentUri);

		expect(execSpy).toHaveBeenCalledWith('mentor.command.deletePrefixes', expect.anything(), expect.any(Array));
	});

	it('should apply text edits when a formatter provides edits', async () => {
		const uri = 'file:///format.ttl';
		const document = createDocument(uri);

		(vscode.workspace as any).textDocuments = [document];

		vi.spyOn(vscode.languages, 'getDiagnostics').mockReturnValue([]);

		const edit = new vscode.TextEdit(new (vscode as any).Range(0, 0, 0, 5), 'hello');

		vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue([edit] as any);

		const applySpy = vi.spyOn(vscode.workspace, 'applyEdit').mockResolvedValue(true);
		const documentUri = vscode.Uri.parse(uri);
		
		await cleanDocument.handler(documentUri as any);

		expect(applySpy).toHaveBeenCalled();
	});
});
