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
 */
function setup(body: string): { document: EditableTextDocument; context: TurtleDocument } {
	const document = createEditableTextDocument(PREAMBLE + body, { uri: URI });
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
 * Build a request rewriting the statement of `ex:s ex:p`.
 */
function replaceRequest(baseVersion: number, text: string): EditRequest {
	return {
		editId: 'e1',
		baseVersion,
		operations: [{ op: 'replaceStatement', subject: { kind: 'iri', iri: `${EX}s` }, predicate: `${EX}p`, text }]
	};
}

describe('FormEditorEditHandler', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('applies a verified edit and re-parses the document right away', async () => {
		const { document, context } = setup('ex:s ex:p "old" .\n');

		applyEditsTo(document);

		const outcome = await new FormEditorEditHandler().handle(replaceRequest(1, 'ex:p "new"'), { document, context });

		expect(outcome).toMatchObject({ ok: true, version: 2, renamedIds: [] });
		expect(document.getText()).toBe(`${PREAMBLE}ex:s ex:p "new" .\n`);
		expect(context.getParseResult(document.getText())).toBeDefined();
		expect(outcome.ok && outcome.focus).toEqual({ offset: PREAMBLE.length + 'ex:s '.length, target: 'predicate' });
	});

	it('rejects a request built against an older version of the document', async () => {
		const { document, context } = setup('ex:s ex:p "old" .\n');

		const outcome = await new FormEditorEditHandler().handle(replaceRequest(0, 'ex:p "new"'), { document, context });

		expect(outcome).toEqual({ ok: false, reason: 'staleVersion', message: expect.any(String) });
		expect(document.getText()).toContain('"old"');
	});

	it('maps the read-only reasons of the document onto rejection reasons', async () => {
		const { document, context } = setup('ex:s ex:p "old" .\n');
		const handler = new FormEditorEditHandler();

		const syntax = await handler.handle(replaceRequest(1, 'ex:p "new"'), { document, context, readOnly: { reason: 'syntaxErrors', message: 'broken' } });
		const template = await handler.handle(replaceRequest(1, 'ex:p "new"'), { document, context, readOnly: { reason: 'template', message: 'template' } });

		expect(syntax).toMatchObject({ ok: false, reason: 'parseErrors' });
		expect(template).toMatchObject({ ok: false, reason: 'readOnly', message: 'template' });
	});

	it('re-parses stale tokens before synthesizing, so the edit targets the current text', async () => {
		const { document, context } = setup('ex:s ex:p "old" .\n');

		applyEditsTo(document);

		// The user typed in a split text editor and the debounced parse has not run yet.
		document.setText(`${PREAMBLE}# note\nex:s ex:p "old" .\n`);

		const outcome = await new FormEditorEditHandler().handle(replaceRequest(2, 'ex:p "new"'), { document, context });

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

		await new FormEditorEditHandler().handle(replaceRequest(1, 'ex:p "new"'), { document, context, tokenSource });

		expect(refreshed).toEqual([URI]);
	});

	it('leaves the document alone when the synthesis rejects the request', async () => {
		const { document, context } = setup('ex:s ex:p "old" .\n');
		const spy = vi.spyOn(vscode.workspace, 'applyEdit');
		const request: EditRequest = {
			editId: 'e2',
			baseVersion: 1,
			operations: [{ op: 'deleteProperty', subject: { kind: 'iri', iri: `${EX}s` }, predicate: `${EX}p` }]
		};

		const outcome = await new FormEditorEditHandler().handle(request, { document, context });

		expect(outcome).toMatchObject({ ok: false, reason: 'wouldRemoveSubject' });
		expect(spy).not.toHaveBeenCalled();
		expect(document.version).toBe(1);
	});

	it('reports the blank nodes an edit renumbered', async () => {
		const { document, context } = setup('ex:s ex:p [ ex:r "x" ] ;\n    ex:q "old" .\n');

		applyEditsTo(document);

		const request: EditRequest = {
			editId: 'e3',
			baseVersion: 1,
			operations: [{ op: 'replaceStatement', subject: { kind: 'iri', iri: `${EX}s` }, predicate: `${EX}q`, text: 'ex:q "new"' }]
		};
		const outcome = await new FormEditorEditHandler().handle(request, { document, context });

		// The bracket keeps its place in the token order, so its identifier survives.
		expect(outcome).toMatchObject({ ok: true, renamedIds: [] });
	});
});
