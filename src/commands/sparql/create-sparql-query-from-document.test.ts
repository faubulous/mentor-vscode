import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import type { IDocumentContext } from '@src/services/document/document-context.interface';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const {
	mockGetQueryTemplate,
	mockIsWorkspaceConnectionId,
	mockGetConnectionForDocument,
	mockSetQuerySourceForDocument,
	mockGetContextFromUri,
} = vi.hoisted(() => ({
	mockGetQueryTemplate: vi.fn((_connection: any, _kind: string) => undefined as string | undefined),
	mockIsWorkspaceConnectionId: vi.fn((id: string) => id === 'workspace'),
	mockGetConnectionForDocument: vi.fn(() => ({ id: 'workspace', storeType: 'workspace' })),
	mockSetQuerySourceForDocument: vi.fn(async () => {}),
	mockGetContextFromUri: vi.fn((_uri: string) => undefined as IDocumentContext | undefined),
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'StoreConfigService') {
				return { getQueryTemplate: mockGetQueryTemplate, isWorkspaceConnectionId: mockIsWorkspaceConnectionId };
			}
			if (token === 'DocumentConnectionService') {
				return { getConnectionForDocument: mockGetConnectionForDocument, setQuerySourceForDocument: mockSetQuerySourceForDocument };
			}
			if (token === 'DocumentContextService') {
				return { getContextFromUri: mockGetContextFromUri };
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { createSparqlQueryFromDocument } from '@src/commands/sparql/create-sparql-query-from-document';
import { createMockDocumentContext } from '@src/utilities/mocks/factories';

/**
 * The template the extension ships, so the command is exercised against the real default rather
 * than a copy that could drift away from it.
 */
const SHIPPED_TEMPLATE: string = (() => {
	const pkg = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
	return pkg.contributes.configuration[0].properties['mentor.sparql.documentQueryTemplate'].default;
})();

/**
 * The content of the SPARQL document the command opened.
 */
function openedContent(): string {
	return (vscode.workspace.openTextDocument as any).mock.calls[0][0].content;
}

/**
 * Sets the active editor to a document with the given URI.
 */
function activateDocument(uri: string): void {
	(vscode.window as any).activeTextEditor = {
		document: { uri: vscode.Uri.parse(uri), languageId: 'turtle' },
	};
}

beforeEach(() => {
	vi.clearAllMocks();

	mockGetQueryTemplate.mockReturnValue(SHIPPED_TEMPLATE);
	mockIsWorkspaceConnectionId.mockImplementation((id: string) => id === 'workspace');
	mockGetConnectionForDocument.mockReturnValue({ id: 'workspace', storeType: 'workspace' });
	mockGetContextFromUri.mockReturnValue(undefined);

	(vscode.window as any).activeTextEditor = undefined;
	(vscode.window as any).showErrorMessage = vi.fn(async () => undefined);
	(vscode.workspace as any).openTextDocument = vi.fn(async () => ({
		uri: vscode.Uri.parse('untitled:result'),
	}));
	(vscode.window as any).showTextDocument = vi.fn(async () => undefined);
});

describe('createSparqlQueryFromDocument command', () => {
	it('should have correct id', () => {
		expect(createSparqlQueryFromDocument.id).toBe('mentor.command.createSparqlQueryFromDocument');
	});

	it('should show error when no active editor', async () => {
		await createSparqlQueryFromDocument.handler();

		expect(vscode.window.showErrorMessage).toHaveBeenCalled();
		expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
	});

	it('should show error when no template is configured', async () => {
		mockGetQueryTemplate.mockReturnValue(undefined);
		activateDocument('file:///w/test.ttl');

		await createSparqlQueryFromDocument.handler();

		expect(vscode.window.showErrorMessage).toHaveBeenCalled();
		expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
	});

	it('should resolve the template for the documentQuery kind', async () => {
		activateDocument('file:///w/test.ttl');

		await createSparqlQueryFromDocument.handler();

		expect(mockGetQueryTemplate).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'workspace' }),
			'documentQuery'
		);
	});

	// The regression guard for mentor-vscode#83: the document is a named graph, not a subject.
	it('should scope the query to the document graph on the workspace store', async () => {
		activateDocument('file:///w/test.ttl');

		await createSparqlQueryFromDocument.handler();

		expect(openedContent()).toContain('GRAPH <workspace:///test.ttl>');
		expect(vscode.window.showTextDocument).toHaveBeenCalled();
	});

	it('should use the document context graph IRI so notebook cell slugs are preserved', async () => {
		mockGetContextFromUri.mockReturnValue(createMockDocumentContext({ graphIri: vscode.Uri.parse('workspace:///notes.ttl#cell-2') }));
		activateDocument('vscode-notebook-cell:/w/notes.ttl#W3sZmlsZQ');

		await createSparqlQueryFromDocument.handler();

		expect(openedContent()).toContain('GRAPH <workspace:///notes.ttl#cell-2>');
		expect(openedContent()).not.toContain('W3sZmlsZQ');
	});

	it('should omit the graph clause for a non-workspace connection', async () => {
		mockGetConnectionForDocument.mockReturnValue({ id: 'fuseki', storeType: 'jena' });
		activateDocument('file:///w/test.ttl');

		await createSparqlQueryFromDocument.handler();

		// The workspace graph IRI means nothing to a remote store, so the query stays unscoped.
		expect(openedContent()).not.toContain('GRAPH');
		expect(openedContent()).toContain('?s ?p ?o');
	});

	it('should bind the generated query to a non-workspace connection', async () => {
		mockGetConnectionForDocument.mockReturnValue({ id: 'fuseki', storeType: 'jena' });
		activateDocument('file:///w/test.ttl');

		await createSparqlQueryFromDocument.handler();

		expect(mockSetQuerySourceForDocument).toHaveBeenCalledWith(vscode.Uri.parse('untitled:result'), 'fuseki');
	});

	it('should not rebind the generated query on the workspace store', async () => {
		activateDocument('file:///w/test.ttl');

		await createSparqlQueryFromDocument.handler();

		expect(mockSetQuerySourceForDocument).not.toHaveBeenCalled();
	});

	it('should report a template that cannot be rendered instead of throwing', async () => {
		// A customized template that still declares `documentIri` as required cannot bind when the
		// connection is not the workspace store and no graph is passed.
		mockGetQueryTemplate.mockReturnValue('---\nparams {\n  documentIri: iri\n}\n---\nSELECT * WHERE { ${documentIri} ?p ?o }');
		mockGetConnectionForDocument.mockReturnValue({ id: 'fuseki', storeType: 'jena' });
		activateDocument('file:///w/test.ttl');

		await expect(createSparqlQueryFromDocument.handler()).resolves.toBeUndefined();

		expect(vscode.window.showErrorMessage).toHaveBeenCalled();
		expect(vscode.workspace.openTextDocument).not.toHaveBeenCalled();
	});
});
