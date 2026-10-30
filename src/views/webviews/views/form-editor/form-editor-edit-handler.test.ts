import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import * as vscode from 'vscode';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { IDocumentTokenSource } from '@src/services/document/document-token-source.interface';
import { EditableTextDocument, applyWorkspaceEditTo, createEditableTextDocument, createTurtleDocument } from '@src/utilities/mocks/factories';
import { EditRequest, FormEditorEditHandler } from './form-editor-edit-handler';

const EX = 'http://example.org/';
const PREAMBLE = `@prefix ex: <${EX}> .\n\n`;
const URI = 'file:///workspace/test.ttl';

/**
 * Create the document and its parsed context.
 * @param body The statements, written after the prefix declarations.
 * @param text The whole text, in place of the declarations and the statements.
 */
function setup(body: string, text = PREAMBLE + body): { document: EditableTextDocument; context: TurtleDocument } {
	const document = createEditableTextDocument(text, { uri: URI });
	const context = createTurtleDocument(URI, RdfSyntax.Turtle);

	context.parse(document.getText());

	return { document, context };
}

/**
 * Make the workspace apply the edits to the document.
 */
function applyEditsTo(document: EditableTextDocument): void {
	vi.spyOn(vscode.workspace, 'applyEdit').mockImplementation(async edit => applyWorkspaceEditTo(edit, document));
}

/**
 * Build a request making a literal the one value of `ex:s ex:p`.
 */
function setValueRequest(baseVersion: number, value: string): EditRequest {
	return {
		editId: 'e1',
		baseVersion,
		operations: [{ op: 'setValues', subject: { kind: 'iri', iri: `${EX}s` }, predicate: `${EX}p`, values: [{ kind: 'term', term: { kind: 'literal', value } }] }]
	};
}

describe('FormEditorEditHandler', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('applies a verified edit and re-parses the document right away', async () => {
		const { document, context } = setup('ex:s ex:p "old" .\n');

		applyEditsTo(document);

		const outcome = await new FormEditorEditHandler().handle(setValueRequest(1, 'new'), { document, context });

		expect(outcome).toEqual({ ok: true, version: 2 });
		expect(document.getText()).toBe(`${PREAMBLE}ex:s ex:p "new" .\n`);
		expect(context.getParseResult(document.getText())).toBeDefined();
	});

	it('rejects a request built against an older version of the document', async () => {
		const { document, context } = setup('ex:s ex:p "old" .\n');

		const outcome = await new FormEditorEditHandler().handle(setValueRequest(0, 'new'), { document, context });

		expect(outcome).toEqual({ ok: false, reason: 'staleVersion', message: expect.any(String) });
		expect(document.getText()).toContain('"old"');
	});

	it('refuses a document whose text does not parse, and a template', async () => {
		const handler = new FormEditorEditHandler();
		const broken = setup('ex:s ex:p "old"\n');
		const template = setup('', `---\n---\n${PREAMBLE}ex:s ex:p "old" .\n`);

		expect(await handler.handle(setValueRequest(1, 'new'), broken)).toMatchObject({ ok: false, reason: 'parseErrors' });
		expect(await handler.handle(setValueRequest(1, 'new'), template)).toMatchObject({ ok: false, reason: 'readOnly' });
	});

	it('edits a document that parses, whatever error diagnostics it has', async () => {
		const { document, context } = setup('ex:s ex:p "old" .\n');

		applyEditsTo(document);
		vi.spyOn(vscode.languages, 'getDiagnostics').mockReturnValue([new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), 'A lint finding', vscode.DiagnosticSeverity.Error)] as unknown as ReturnType<typeof vscode.languages.getDiagnostics>);

		expect(await new FormEditorEditHandler().handle(setValueRequest(1, 'new'), { document, context })).toEqual({ ok: true, version: 2 });
	});

	it('re-parses stale tokens before synthesizing, so the edit targets the current text', async () => {
		const { document, context } = setup('ex:s ex:p "old" .\n');

		applyEditsTo(document);

		// The user typed in a split text editor and the debounced parse has not run yet.
		document.setText(`${PREAMBLE}# note\nex:s ex:p "old" .\n`);

		const outcome = await new FormEditorEditHandler().handle(setValueRequest(2, 'new'), { document, context });

		expect(outcome).toMatchObject({ ok: true });
		expect(document.getText()).toBe(`${PREAMBLE}# note\nex:s ex:p "new" .\n`);
	});

	it('refreshes through the token source when there is one', async () => {
		const { document, context } = setup('ex:s ex:p "old" .\n');
		const refreshed: string[] = [];
		const tokenSource = {
			refreshTokens: (uri: string) => {
				refreshed.push(uri);
				context.parse(document.getText());

				return true;
			}
		} as unknown as IDocumentTokenSource;

		applyEditsTo(document);

		await new FormEditorEditHandler().handle(setValueRequest(1, 'new'), { document, context, tokenSource });

		expect(refreshed).toEqual([URI]);
	});

	it('leaves the document alone when the synthesis rejects the request', async () => {
		const { document, context } = setup('ex:s ex:p "old" .\n');
		const spy = vi.spyOn(vscode.workspace, 'applyEdit');
		const request: EditRequest = {
			editId: 'e2',
			baseVersion: 1,
			operations: [{ op: 'setValues', subject: { kind: 'iri', iri: `${EX}s` }, predicate: `${EX}p`, values: [] }]
		};

		const outcome = await new FormEditorEditHandler().handle(request, { document, context });

		expect(outcome).toMatchObject({ ok: false, reason: 'wouldRemoveSubject' });
		expect(spy).not.toHaveBeenCalled();
		expect(document.version).toBe(1);
	});
});
