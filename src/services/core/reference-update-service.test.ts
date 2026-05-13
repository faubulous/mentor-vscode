import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import * as vscode from 'vscode';
import { ReferenceUpdateService } from '@src/services/core/reference-update-service';
import { WorkspaceUri } from '@src/providers/workspace-uri';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Creates a minimal DocumentContext stub with a `references` map and a URI.
 */
function makeContext(
	uri: string,
	slug: string | undefined,
	refs: Record<string, Array<{ start: { line: number; character: number }; end: { line: number; character: number } }>>
) {
	return {
		uri: vscode.Uri.parse(uri),
		slug,
		references: refs,
	};
}

/**
 * Creates a service with a pre-populated fake DocumentContextService.
 */
function makeService(contexts: Record<string, any>) {
	const mockContextService = { contexts } as any;
	return new ReferenceUpdateService(mockContextService);
}

// A real Range value from the LSP types shape used in DocumentContext.references
function range(sl: number, sc: number, el: number, ec: number) {
	return { start: { line: sl, character: sc }, end: { line: el, character: ec } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReferenceUpdateService', () => {
	let applyEditSpy: ReturnType<typeof vi.spyOn>;
	let showWarningMessageSpy: ReturnType<typeof vi.spyOn>;
	let openTextDocumentSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		applyEditSpy = vi.spyOn(vscode.workspace, 'applyEdit').mockResolvedValue(true);
		showWarningMessageSpy = vi.spyOn(vscode.window, 'showWarningMessage').mockResolvedValue(undefined as any);

		// Default: openTextDocument returns a document whose getText returns an IRIREF-shaped string
		openTextDocumentSpy = vi.spyOn(vscode.workspace, 'openTextDocument').mockImplementation(async (uri: any) => ({
			uri,
			getText: (_range?: vscode.Range) => '<workspace:///notebook.mnb#cell-1>',
		} as any));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('batchUpdate', () => {
		it('does nothing when changes is empty', async () => {
			const service = makeService({});
			await service.batchUpdate(new Map());
			expect(applyEditSpy).not.toHaveBeenCalled();
		});

		it('applies edits silently when there are no external references', async () => {
			const origin = vscode.Uri.parse('file:///w/notebook.mnb');
			const oldIri = 'workspace:///notebook.mnb#cell-1';
			const newIri = 'workspace:///notebook.mnb#my-data';

			// Context whose URI belongs to the same origin notebook
			const ctx = makeContext('vscode-notebook-cell:///w/notebook.mnb#opaqueCell1', 'cell-1', {
				[oldIri]: [range(3, 5, 3, 5 + `<${oldIri}>`.length - 1)],
			});

			openTextDocumentSpy.mockResolvedValue({
				uri: ctx.uri,
				getText: () => `<${oldIri}>`,
			} as any);

			const service = makeService({ [ctx.uri.toString()]: ctx });
			await service.batchUpdate(new Map([[oldIri, newIri]]), origin);

			expect(showWarningMessageSpy).not.toHaveBeenCalled();
			expect(applyEditSpy).toHaveBeenCalledOnce();
		});

		it('shows a confirmation dialog when external references exist', async () => {
			showWarningMessageSpy.mockResolvedValue('Apply' as any);

			const origin = vscode.Uri.parse('file:///w/notebook.mnb');
			const oldIri = 'workspace:///notebook.mnb#cell-1';
			const newIri = 'workspace:///notebook.mnb#my-data';

			// External context — a separate .sparql file
			const ctx = makeContext('file:///w/queries/query.sparql', undefined, {
				[oldIri]: [range(1, 5, 1, 5 + `<${oldIri}>`.length - 1)],
			});

			openTextDocumentSpy.mockResolvedValue({
				uri: ctx.uri,
				getText: () => `<${oldIri}>`,
			} as any);

			const service = makeService({ [ctx.uri.toString()]: ctx });
			await service.batchUpdate(new Map([[oldIri, newIri]]), origin);

			expect(showWarningMessageSpy).toHaveBeenCalledOnce();
			const callArgs = showWarningMessageSpy.mock.calls[0];
			expect(callArgs[0]).toMatch(/1 reference/);
			expect(callArgs[0]).toMatch(/1 file/);
			expect(applyEditSpy).toHaveBeenCalledOnce();
		});

		it('applies edits silently when no origin is given and there are only external references', async () => {
			const oldIri = 'workspace:///data.ttl';
			const newIri = 'workspace:///renamed.ttl';

			const ctx = makeContext('file:///w/queries/query.sparql', undefined, {
				[oldIri]: [range(0, 5, 0, 5 + `<${oldIri}>`.length - 1)],
			});

			openTextDocumentSpy.mockResolvedValue({
				uri: ctx.uri,
				getText: () => `<${oldIri}>`,
			} as any);

			const service = makeService({ [ctx.uri.toString()]: ctx });
			await service.batchUpdate(new Map([[oldIri, newIri]]));

			// Without an origin, all references are "external" but there is nobody to guard
			// the internal set — show dialog.
			expect(showWarningMessageSpy).toHaveBeenCalledOnce();
		});

		it('replaces an IRIREF token with angle-bracket form of new IRI', async () => {
			const oldIri = 'workspace:///notebook.mnb#cell-1';
			const newIri = 'workspace:///notebook.mnb#my-data';

			const ctx = makeContext('file:///w/query.sparql', undefined, {
				[oldIri]: [range(2, 5, 2, 5 + `<${oldIri}>`.length - 1)],
			});

			openTextDocumentSpy.mockResolvedValue({
				uri: ctx.uri,
				getText: () => `<${oldIri}>`,
			} as any);

			showWarningMessageSpy.mockResolvedValue('Apply' as any);

			const service = makeService({ [ctx.uri.toString()]: ctx });
			await service.batchUpdate(new Map([[oldIri, newIri]]));

			// Inspect the WorkspaceEdit that was applied
			const editArg: vscode.WorkspaceEdit = applyEditSpy.mock.calls[0][0];
			const edits = (editArg as any).entries as Array<any>;
			expect(edits.length).toBeGreaterThan(0);
			expect(edits[0].newText).toBe(`<${newIri}>`);
		});

		it('replaces a PNAME token with angle-bracket form of new IRI', async () => {
			const oldIri = 'workspace:///notebook.mnb#cell-1';
			const newIri = 'workspace:///notebook.mnb#my-data';
			const pnameImage = 'ws:cell-1'; // pretend this is a prefixed name in the doc

			const ctx = makeContext('file:///w/query.sparql', undefined, {
				[oldIri]: [range(0, 0, 0, pnameImage.length - 1)],
			});

			openTextDocumentSpy.mockResolvedValue({
				uri: ctx.uri,
				getText: () => pnameImage,
			} as any);

			showWarningMessageSpy.mockResolvedValue('Apply' as any);

			const service = makeService({ [ctx.uri.toString()]: ctx });
			await service.batchUpdate(new Map([[oldIri, newIri]]));

			const editArg: vscode.WorkspaceEdit = applyEditSpy.mock.calls[0][0];
			const edits = (editArg as any).entries as Array<any>;
			// PNAME fallback: emit full IRI form
			expect(edits[0].newText).toBe(`<${newIri}>`);
		});

		it('handles multiple IRI changes in a single call', async () => {
			showWarningMessageSpy.mockResolvedValue('Apply' as any);

			const changes = new Map([
				['workspace:///notebook.mnb#cell-1', 'workspace:///notebook.mnb#cell-a'],
				['workspace:///notebook.mnb#cell-2', 'workspace:///notebook.mnb#cell-b'],
			]);

			const ctx = makeContext('file:///w/query.sparql', undefined, {
				'workspace:///notebook.mnb#cell-1': [range(1, 5, 1, 40)],
				'workspace:///notebook.mnb#cell-2': [range(2, 5, 2, 40)],
			});

			openTextDocumentSpy.mockResolvedValue({
				uri: ctx.uri,
				getText: (r: vscode.Range) => r.start.line === 1
					? '<workspace:///notebook.mnb#cell-1>'
					: '<workspace:///notebook.mnb#cell-2>',
			} as any);

			const service = makeService({ [ctx.uri.toString()]: ctx });
			await service.batchUpdate(changes);

			const editArg: vscode.WorkspaceEdit = applyEditSpy.mock.calls[0][0];
			const edits = (editArg as any).entries as Array<any>;
			expect(edits).toHaveLength(2);
		});

		it('skips contexts whose document cannot be opened', async () => {
			openTextDocumentSpy.mockRejectedValue(new Error('cannot open'));

			const oldIri = 'workspace:///data.ttl';
			const ctx = makeContext('file:///w/data.ttl', undefined, {
				[oldIri]: [range(0, 0, 0, 30)],
			});

			const service = makeService({ [ctx.uri.toString()]: ctx });
			// Should not throw
			await expect(service.batchUpdate(new Map([[oldIri, 'workspace:///renamed.ttl']]))).resolves.toBeUndefined();
			expect(applyEditSpy).toHaveBeenCalledOnce(); // empty edit still applied silently
		});
	});

	describe('buildChangesForRenames', () => {
		afterEach(() => {
			WorkspaceUri.rootUri = undefined;
		});

		it('maps old workspace IRI to new workspace IRI for a simple file rename', () => {
			const ctx = makeContext('file:///w/data.ttl', undefined, {});
			const service = makeService({ [ctx.uri.toString()]: ctx });

			const changes = service.buildChangesForRenames([{
				oldUri: vscode.Uri.parse('file:///w/data.ttl'),
				newUri: vscode.Uri.parse('file:///w/renamed.ttl'),
			}]);

			expect(changes.get('workspace:///data.ttl')).toBe('workspace:///renamed.ttl');
		});

		it('maps all cells of a renamed notebook', () => {
			// Simulate two notebook cells indexed under the old notebook path
			const cell1 = makeContext('vscode-notebook-cell:///w/notebook.mnb#opaqueA', 'cell-1', {});
			const cell2 = makeContext('vscode-notebook-cell:///w/notebook.mnb#opaqueB', 'cell-2', {});

			// WorkspaceUri.toWorkspaceUri uses the workspace folders from the mock.
			// Our mock workspace root is /w, so cell workspace URIs are workspace:///notebook.mnb#cell-1 etc.
			const service = makeService({
				[cell1.uri.toString()]: cell1,
				[cell2.uri.toString()]: cell2,
			});

			const changes = service.buildChangesForRenames([{
				oldUri: vscode.Uri.parse('file:///w/notebook.mnb'),
				newUri: vscode.Uri.parse('file:///w/renamed.mnb'),
			}]);

			expect(changes.get('workspace:///notebook.mnb#cell-1')).toBe('workspace:///renamed.mnb#cell-1');
			expect(changes.get('workspace:///notebook.mnb#cell-2')).toBe('workspace:///renamed.mnb#cell-2');
		});

		it('produces no changes when the renamed file has no indexed context', () => {
			const service = makeService({});

			const changes = service.buildChangesForRenames([{
				oldUri: vscode.Uri.parse('file:///w/unknown.ttl'),
				newUri: vscode.Uri.parse('file:///w/renamed.ttl'),
			}]);

			// At minimum the bare file IRI is added
			expect(changes.get('workspace:///unknown.ttl')).toBe('workspace:///renamed.ttl');
		});

		it('handles multiple renames in a single call', () => {
			const ctxA = makeContext('file:///w/a.ttl', undefined, {});
			const ctxB = makeContext('file:///w/b.ttl', undefined, {});
			const service = makeService({
				[ctxA.uri.toString()]: ctxA,
				[ctxB.uri.toString()]: ctxB,
			});

			const changes = service.buildChangesForRenames([
				{ oldUri: vscode.Uri.parse('file:///w/a.ttl'), newUri: vscode.Uri.parse('file:///w/x.ttl') },
				{ oldUri: vscode.Uri.parse('file:///w/b.ttl'), newUri: vscode.Uri.parse('file:///w/y.ttl') },
			]);

			expect(changes.get('workspace:///a.ttl')).toBe('workspace:///x.ttl');
			expect(changes.get('workspace:///b.ttl')).toBe('workspace:///y.ttl');
		});

		it('skips renames for files outside the workspace root', () => {
			const service = makeService({});

			const changes = service.buildChangesForRenames([{
				// File outside the workspace folder /w — toWorkspaceUri returns undefined
				oldUri: vscode.Uri.parse('file:///outside/data.ttl'),
				newUri: vscode.Uri.parse('file:///outside/renamed.ttl'),
			}]);

			expect(changes.size).toBe(0);
		});
	});
});
