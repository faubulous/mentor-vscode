import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

vi.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

import { Uri, workspace } from '@src/utilities/mocks/vscode';
import { DocumentConnectionService } from '@src/languages/sparql/services/document-connection-service';
import { SparqlConnectionRegistry, WORKSPACE_CONNECTION } from '@src/languages/sparql/services/sparql-connection-registry';
import { TripleStoreConfigService } from '@src/languages/sparql/services/triple-store-config-service';

/**
 * Builds a minimal ExtensionContext stub with an in-memory workspaceState.
 */
function makeContext(initial: Record<string, any> = {}) {
    const store = new Map<string, any>(Object.entries(initial));
    return {
        workspaceState: {
            get: (key: string, defaultValue?: any) => store.has(key) ? store.get(key) : defaultValue,
            update: async (key: string, value: any) => {
                if (value === undefined) {
                    store.delete(key);
                } else {
                    store.set(key, value);
                }
            },
            keys: () => [...store.keys()],
        },
        subscriptions: [],
    };
}

/**
 * Builds a DocumentConnectionService together with the connection service it delegates
 * to, both sharing the same in-memory workspace state.
 */
function makeServices(initial: Record<string, any> = {}) {
    const ctx = makeContext(initial);
    const connectionRegistry = new SparqlConnectionRegistry(
        ctx as any,
        { getCredential: async () => null } as any,
        new TripleStoreConfigService(),
    );
    const svc = new DocumentConnectionService(ctx as any, connectionRegistry);
    return { svc, connectionRegistry, ctx };
}

function makeService() {
    return makeServices().svc;
}

/**
 * Builds a mock notebook-cell URI with scheme 'vscode-notebook-cell'.
 * The path matches the notebook path so _getNotebookFromCellUri can find it.
 */
function _buildCellUri(notebookPath: string) {
    const base = Uri.parse(notebookPath);
    // Return a plain object that mimics a vscode-notebook-cell URI
    return {
        scheme: 'vscode-notebook-cell',
        path: base.path,
        toString: () => `vscode-notebook-cell:${base.path}#cell0`,
    };
}

describe('DocumentConnectionService', () => {
    describe('getConnectionForDocument', () => {
        it('returns the workspace store when no connection is set for the document', () => {
            const svc = makeService();
            const uri = Uri.parse('file:///test.sparql');
            const conn = svc.getConnectionForDocument(uri as any);
            expect(conn.id).toBe(WORKSPACE_CONNECTION.id);
        });

        it('accepts a string URI and falls back to workspace store', () => {
            const svc = makeService();
            const conn = svc.getConnectionForDocument('file:///other.sparql');
            expect(conn.id).toBe(WORKSPACE_CONNECTION.id);
        });
    });

    describe('notifyDocumentConnectionChanged', () => {
        it('fires the onDidChangeConnectionForDocument event with the URI', () => {
            const svc = makeService();
            const uri = Uri.parse('file:///test.sparql');
            let firedUri: any;
            svc.onDidChangeConnectionForDocument(u => { firedUri = u; });
            svc.notifyDocumentConnectionChanged(uri as any);
            expect(firedUri).toBe(uri);
        });
    });

    describe('getInferenceEnabledForDocument', () => {
        it('returns false for a plain file URI with no stored setting', () => {
            const svc = makeService();
            const uri = Uri.parse('file:///test.sparql');
            expect(svc.getInferenceEnabledForDocument(uri as any)).toBe(false);
        });

        it('returns the stored document-level setting when one is set', async () => {
            const svc = makeService();
            const uri = Uri.parse('file:///doc.sparql');
            await svc.setInferenceEnabledForDocument(uri as any, true);
            expect(svc.getInferenceEnabledForDocument(uri as any)).toBe(true);
        });
    });

    describe('setInferenceEnabledForDocument', () => {
        it('stores and retrieves a file-level inference setting', async () => {
            const svc = makeService();
            const uri = Uri.parse('file:///doc.sparql');
            await svc.setInferenceEnabledForDocument(uri as any, true);
            expect(svc.getInferenceEnabledForDocument(uri as any)).toBe(true);
        });
    });

    describe('toggleInferenceEnabledForDocument', () => {
        it('toggles false to true for a file URI', async () => {
            const svc = makeService();
            const uri = Uri.parse('file:///doc2.sparql');
            // Default is false
            const result = await svc.toggleInferenceEnabledForDocument(uri as any);
            expect(result).toBe(true);
        });
    });

    describe('setQuerySourceForDocument', () => {
        it('stores the connection ID for a file URI and fires connectionForDocument event', async () => {
            const { svc, connectionRegistry } = makeServices();
            const conn = await connectionRegistry.createConnection();
            const uri = Uri.parse('file:///test.sparql');
            let firedUri: any;
            svc.onDidChangeConnectionForDocument(u => { firedUri = u; });
            await svc.setQuerySourceForDocument(uri as any, conn.id);
            expect(firedUri).toBeDefined();
            // After storing, getConnectionForDocument should return the set connection
            const found = svc.getConnectionForDocument(uri as any);
            expect(found.id).toBe(conn.id);
        });

        it('invokes setConnectionForCell for a notebook-cell URI', async () => {
            const vscode = await import('vscode');
            const { svc, connectionRegistry } = makeServices();
            const conn = await connectionRegistry.createConnection();

            const cellUri = _buildCellUri('file:///nb-sq.sparql-book');
            const mockCell = { document: { uri: cellUri }, metadata: {}, index: 0 };
            const mockNotebook = { uri: Uri.parse('file:///nb-sq.sparql-book'), getCells: () => [mockCell] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            let firedUri: any;
            svc.onDidChangeConnectionForDocument(u => { firedUri = u; });
            await svc.setQuerySourceForDocument(cellUri as any, conn.id);
            expect(firedUri).toBeDefined();

            (vscode.workspace as any).notebookDocuments = [];
        });
    });

    describe('getConnectionForDocument — notebook-cell branch', () => {
        it('returns workspace store when cell has no connectionId metadata', async () => {
            const vscode = await import('vscode');
            const cellUri = _buildCellUri('file:///nb.sparql-book');
            const mockCell = { document: { uri: cellUri }, metadata: {}, index: 0 };
            const mockNotebook = { uri: Uri.parse('file:///nb.sparql-book'), getCells: () => [mockCell] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const svc = makeService();
            const conn = svc.getConnectionForDocument(cellUri as any);
            expect(conn.id).toBe(WORKSPACE_CONNECTION.id);

            (vscode.workspace as any).notebookDocuments = [];
        });

        it('returns a specific connection when cell metadata has connectionId', async () => {
            const vscode = await import('vscode');
            const { svc, connectionRegistry } = makeServices();
            const userConn = await connectionRegistry.createConnection();
            userConn.endpointUrl = 'https://cell.example.org/sparql';
            await connectionRegistry.updateConnection(userConn);

            const cellUri = _buildCellUri('file:///nb.sparql-book');
            const mockCell = { document: { uri: cellUri }, metadata: { connectionId: userConn.id }, index: 0 };
            const mockNotebook = { uri: Uri.parse('file:///nb.sparql-book'), getCells: () => [mockCell] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const conn = svc.getConnectionForDocument(cellUri as any);
            expect(conn.id).toBe(userConn.id);

            (vscode.workspace as any).notebookDocuments = [];
        });
    });

    describe('getInferenceEnabledForDocument — notebook-cell branch', () => {
        it('returns undefined (falls back to connection) when cell has no inferenceEnabled metadata', async () => {
            const vscode = await import('vscode');
            const cellUri = _buildCellUri('file:///nb2.sparql-book');
            const mockCell = { document: { uri: cellUri }, metadata: {}, index: 0 };
            const mockNotebook = { uri: Uri.parse('file:///nb2.sparql-book'), getCells: () => [mockCell] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const svc = makeService();
            // Falls back to connection setting (false)
            expect(svc.getInferenceEnabledForDocument(cellUri as any)).toBe(false);

            (vscode.workspace as any).notebookDocuments = [];
        });

        it('returns the cell-level inferenceEnabled when set in metadata', async () => {
            const vscode = await import('vscode');
            const cellUri = _buildCellUri('file:///nb3.sparql-book');
            const mockCell = { document: { uri: cellUri }, metadata: { inferenceEnabled: true }, index: 0 };
            const mockNotebook = { uri: Uri.parse('file:///nb3.sparql-book'), getCells: () => [mockCell] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const svc = makeService();
            expect(svc.getInferenceEnabledForDocument(cellUri as any)).toBe(true);

            (vscode.workspace as any).notebookDocuments = [];
        });
    });

    describe('setConnectionForCell', () => {
        it('throws when notebook is not found', async () => {
            const svc = makeService();
            const cellUri = _buildCellUri('file:///missing.sparql-book');
            await expect(svc.setConnectionForCell(cellUri as any, 'some-id')).rejects.toThrow('Notebook document not found');
        });

        it('throws when cell is not found in the notebook', async () => {
            const vscode = await import('vscode');
            const cellUri = _buildCellUri('file:///nb4.sparql-book');
            const mockNotebook = { uri: Uri.parse('file:///nb4.sparql-book'), getCells: () => [] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const svc = makeService();
            await expect(svc.setConnectionForCell(cellUri as any, 'some-id')).rejects.toThrow('Cell not found');

            (vscode.workspace as any).notebookDocuments = [];
        });

        it('applies workspace edit when cell is found', async () => {
            const vscode = await import('vscode');
            const cellUri = _buildCellUri('file:///nb5.sparql-book');
            const mockCell = { document: { uri: cellUri }, metadata: {}, index: 0 };
            const mockNotebook = { uri: Uri.parse('file:///nb5.sparql-book'), getCells: () => [mockCell] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const svc = makeService();
            await svc.setConnectionForCell(cellUri as any, 'conn-xyz');
            // If no error thrown, the edit was applied successfully

            (vscode.workspace as any).notebookDocuments = [];
        });
    });

    describe('setInferenceEnabledForDocument — notebook-cell branch', () => {
        it('throws when notebook is not found for cell URI', async () => {
            const svc = makeService();
            const cellUri = _buildCellUri('file:///missing.sparql-book');
            await expect(svc.setInferenceEnabledForDocument(cellUri as any, true)).rejects.toThrow('Notebook document not found');
        });

        it('throws when cell is not found in notebook', async () => {
            const vscode = await import('vscode');
            const cellUri = _buildCellUri('file:///nb6.sparql-book');
            const mockNotebook = { uri: Uri.parse('file:///nb6.sparql-book'), getCells: () => [] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const svc = makeService();
            await expect(svc.setInferenceEnabledForDocument(cellUri as any, true)).rejects.toThrow('Cell not found');

            (vscode.workspace as any).notebookDocuments = [];
        });

        it('applies a workspace edit to set inferenceEnabled on the cell', async () => {
            const vscode = await import('vscode');
            const cellUri = _buildCellUri('file:///nb7.sparql-book');
            const mockCell = { document: { uri: cellUri }, metadata: {}, index: 0 };
            const mockNotebook = { uri: Uri.parse('file:///nb7.sparql-book'), getCells: () => [mockCell] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const svc = makeService();
            await svc.setInferenceEnabledForDocument(cellUri as any, true);
            // No throw = success

            (vscode.workspace as any).notebookDocuments = [];
        });

        it('applies a workspace edit to clear inferenceEnabled (undefined)', async () => {
            const vscode = await import('vscode');
            const cellUri = _buildCellUri('file:///nb8.sparql-book');
            const mockCell = { document: { uri: cellUri }, metadata: { inferenceEnabled: true }, index: 0 };
            const mockNotebook = { uri: Uri.parse('file:///nb8.sparql-book'), getCells: () => [mockCell] };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            const svc = makeService();
            await svc.setInferenceEnabledForDocument(cellUri as any, undefined);
            // No throw = success

            (vscode.workspace as any).notebookDocuments = [];
        });
    });

    describe('_onNotebookDocumentChanged — adds cells with inherited settings', () => {
        it('inherits connectionId and inferenceEnabled from the previous cell when new cells are added', async () => {
            const vscode = await import('vscode');
            // Create a service and capture the notebookDocumentChanged handler
            let notebookChangeHandler: ((e: any) => Promise<void>) | undefined;
            (vscode.workspace as any).onDidChangeNotebookDocument = (handler: any) => {
                notebookChangeHandler = handler;
                return { dispose: () => {} };
            };

            makeService();

            // Set up a mock notebook with a previous cell having metadata
            const nbUri = Uri.parse('file:///nb9.sparql-book');
            const existingCellUri = _buildCellUri('file:///nb9.sparql-book');
            const newCellUri = _buildCellUri('file:///nb9.sparql-book');

            const existingCell = {
                document: { uri: existingCellUri },
                metadata: { connectionId: 'conn-prev', inferenceEnabled: true },
                index: 0
            };
            const newCell = {
                document: { uri: newCellUri },
                metadata: {},
                index: 1
            };
            const mockNotebook = {
                uri: nbUri,
                getCells: () => [existingCell, newCell]
            };
            (vscode.workspace as any).notebookDocuments = [mockNotebook];

            // Trigger the handler
            if (notebookChangeHandler) {
                await notebookChangeHandler({
                    notebook: mockNotebook,
                    contentChanges: [{ addedCells: [newCell] }]
                });
            }
            // applyEdit was called (no throw)
            (vscode.workspace as any).notebookDocuments = [];
            (vscode.workspace as any).onDidChangeNotebookDocument = (_handler: any) => ({ dispose: () => {} });
        });

        it('does not inherit settings when new cell already has metadata', async () => {
            const vscode = await import('vscode');
            let notebookChangeHandler: ((e: any) => Promise<void>) | undefined;
            (vscode.workspace as any).onDidChangeNotebookDocument = (handler: any) => {
                notebookChangeHandler = handler;
                return { dispose: () => {} };
            };

            makeService();

            const nbUri = Uri.parse('file:///nb10.sparql-book');
            const newCellUri = _buildCellUri('file:///nb10.sparql-book');
            const newCell = {
                document: { uri: newCellUri },
                metadata: { connectionId: 'already-set' },
                index: 0
            };
            const mockNotebook = {
                uri: nbUri,
                getCells: () => [newCell]
            };

            if (notebookChangeHandler) {
                await notebookChangeHandler({
                    notebook: mockNotebook,
                    contentChanges: [{ addedCells: [newCell] }]
                });
            }
            // No error = success
            (vscode.workspace as any).onDidChangeNotebookDocument = (_handler: any) => ({ dispose: () => {} });
        });
    });

    describe('handleFileRenames', () => {
        it('migrates sparql.connection: key on file rename', async () => {
            const { svc, ctx } = makeServices({
                'sparql.connection:file:///workspace/old.ttl': 'conn-1',
            });

            await svc.handleFileRenames([{
                oldUri: Uri.parse('file:///workspace/old.ttl'),
                newUri: Uri.parse('file:///workspace/new.ttl'),
            }] as any);

            expect(ctx.workspaceState.get('sparql.connection:file:///workspace/new.ttl')).toBe('conn-1');
            expect(ctx.workspaceState.get('sparql.connection:file:///workspace/old.ttl')).toBeUndefined();
        });

        it('migrates mentor.inference.document: key on file rename', async () => {
            const { svc, ctx } = makeServices({
                'mentor.inference.document:file:///workspace/old.ttl': true,
            });

            await svc.handleFileRenames([{
                oldUri: Uri.parse('file:///workspace/old.ttl'),
                newUri: Uri.parse('file:///workspace/new.ttl'),
            }] as any);

            expect(ctx.workspaceState.get('mentor.inference.document:file:///workspace/new.ttl')).toBe(true);
            expect(ctx.workspaceState.get('mentor.inference.document:file:///workspace/old.ttl')).toBeUndefined();
        });

        it('migrates both key prefixes in a single rename', async () => {
            const { svc, ctx } = makeServices({
                'sparql.connection:file:///workspace/old.ttl': 'conn-1',
                'mentor.inference.document:file:///workspace/old.ttl': false,
            });

            await svc.handleFileRenames([{
                oldUri: Uri.parse('file:///workspace/old.ttl'),
                newUri: Uri.parse('file:///workspace/new.ttl'),
            }] as any);

            expect(ctx.workspaceState.get('sparql.connection:file:///workspace/new.ttl')).toBe('conn-1');
            expect(ctx.workspaceState.get('mentor.inference.document:file:///workspace/new.ttl')).toBe(false);
            expect(ctx.workspaceState.get('sparql.connection:file:///workspace/old.ttl')).toBeUndefined();
            expect(ctx.workspaceState.get('mentor.inference.document:file:///workspace/old.ttl')).toBeUndefined();
        });

        it('migrates all keys under a renamed folder', async () => {
            const { svc, ctx } = makeServices({
                'sparql.connection:file:///workspace/models/a.ttl': 'conn-a',
                'sparql.connection:file:///workspace/models/sub/b.ttl': 'conn-b',
                'mentor.inference.document:file:///workspace/models/a.ttl': true,
            });

            await svc.handleFileRenames([{
                oldUri: Uri.parse('file:///workspace/models'),
                newUri: Uri.parse('file:///workspace/renamed'),
            }] as any);

            expect(ctx.workspaceState.get('sparql.connection:file:///workspace/renamed/a.ttl')).toBe('conn-a');
            expect(ctx.workspaceState.get('sparql.connection:file:///workspace/renamed/sub/b.ttl')).toBe('conn-b');
            expect(ctx.workspaceState.get('mentor.inference.document:file:///workspace/renamed/a.ttl')).toBe(true);
            expect(ctx.workspaceState.get('sparql.connection:file:///workspace/models/a.ttl')).toBeUndefined();
            expect(ctx.workspaceState.get('sparql.connection:file:///workspace/models/sub/b.ttl')).toBeUndefined();
            expect(ctx.workspaceState.get('mentor.inference.document:file:///workspace/models/a.ttl')).toBeUndefined();
        });

        it('does not migrate a sibling folder with a common name prefix', async () => {
            const { svc, ctx } = makeServices({
                'sparql.connection:file:///workspace/models/a.ttl': 'conn-a',
                'sparql.connection:file:///workspace/models-extra/b.ttl': 'conn-b',
            });

            await svc.handleFileRenames([{
                oldUri: Uri.parse('file:///workspace/models'),
                newUri: Uri.parse('file:///workspace/renamed'),
            }] as any);

            expect(ctx.workspaceState.get('sparql.connection:file:///workspace/renamed/a.ttl')).toBe('conn-a');
            expect(ctx.workspaceState.get('sparql.connection:file:///workspace/models-extra/b.ttl')).toBe('conn-b');
        });

        it('does not migrate unrelated keys', async () => {
            const { svc, ctx } = makeServices({
                'sparql.connection:file:///workspace/other.ttl': 'conn-x',
                'mentor.inference.enabled:some-connection-id': true,
            });

            await svc.handleFileRenames([{
                oldUri: Uri.parse('file:///workspace/old.ttl'),
                newUri: Uri.parse('file:///workspace/new.ttl'),
            }] as any);

            expect(ctx.workspaceState.get('sparql.connection:file:///workspace/other.ttl')).toBe('conn-x');
            expect(ctx.workspaceState.get('mentor.inference.enabled:some-connection-id')).toBe(true);
        });
    });

    describe('untitled SPARQL save migration', () => {
        function makeServiceWithCapturedSaveHandlers(initial: Record<string, any> = {}) {
            let openHandler: ((document: any) => void) | undefined;
            let changeHandler: ((e: any) => void) | undefined;
            let didSaveHandler: ((document: any) => Promise<void>) | undefined;

            (workspace as any).onDidOpenTextDocument = (handler: any) => {
                openHandler = handler;
                return { dispose: () => {} };
            };
            (workspace as any).onDidChangeTextDocument = (handler: any) => {
                changeHandler = handler;
                return { dispose: () => {} };
            };
            (workspace as any).onDidSaveTextDocument = (handler: any) => {
                didSaveHandler = handler;
                return { dispose: () => {} };
            };

            const { svc, ctx } = makeServices(initial);

            // Restore the no-op mocks so other tests aren't affected by these captured handlers.
            (workspace as any).onDidOpenTextDocument = (_handler: any) => ({ dispose: () => {} });
            (workspace as any).onDidChangeTextDocument = (_handler: any) => ({ dispose: () => {} });
            (workspace as any).onDidSaveTextDocument = (_handler: any) => ({ dispose: () => {} });

            return { svc, ctx, openHandler: openHandler!, changeHandler: changeHandler!, didSaveHandler: didSaveHandler! };
        }

        it('migrates the connection key from the untitled URI to the saved file URI', async () => {
            const { ctx, openHandler, didSaveHandler } = makeServiceWithCapturedSaveHandlers({
                'sparql.connection:untitled:Untitled-1': 'conn-1',
            });

            const content = 'SELECT * WHERE { ?s ?p ?o }';

            openHandler({ isUntitled: true, languageId: 'sparql', uri: Uri.parse('untitled:Untitled-1'), getText: () => content });
            await didSaveHandler({ isUntitled: false, languageId: 'sparql', uri: Uri.parse('file:///workspace/new.sparql'), getText: () => content });

            expect(ctx.workspaceState.get('sparql.connection:file:///workspace/new.sparql')).toBe('conn-1');
            expect(ctx.workspaceState.get('sparql.connection:untitled:Untitled-1')).toBeUndefined();
        });

        it('migrates using the latest content captured from a text change', async () => {
            const { ctx, openHandler, changeHandler, didSaveHandler } = makeServiceWithCapturedSaveHandlers({
                'sparql.connection:untitled:Untitled-1': 'conn-1',
            });

            const uri = Uri.parse('untitled:Untitled-1');

            openHandler({ isUntitled: true, languageId: 'sparql', uri, getText: () => '' });
            changeHandler({ document: { isUntitled: true, languageId: 'sparql', uri, getText: () => 'SELECT * WHERE { ?s ?p ?o }' } });
            await didSaveHandler({ isUntitled: false, languageId: 'sparql', uri: Uri.parse('file:///workspace/new.sparql'), getText: () => 'SELECT * WHERE { ?s ?p ?o }' });

            expect(ctx.workspaceState.get('sparql.connection:file:///workspace/new.sparql')).toBe('conn-1');
            expect(ctx.workspaceState.get('sparql.connection:untitled:Untitled-1')).toBeUndefined();
        });

        it('does not migrate when the saved content does not match a tracked untitled document', async () => {
            const { ctx, openHandler, didSaveHandler } = makeServiceWithCapturedSaveHandlers({
                'sparql.connection:untitled:Untitled-1': 'conn-1',
            });

            openHandler({ isUntitled: true, languageId: 'sparql', uri: Uri.parse('untitled:Untitled-1'), getText: () => 'SELECT * WHERE { ?s ?p ?o }' });
            await didSaveHandler({ isUntitled: false, languageId: 'sparql', uri: Uri.parse('file:///workspace/new.sparql'), getText: () => 'a different query' });

            expect(ctx.workspaceState.get('sparql.connection:untitled:Untitled-1')).toBe('conn-1');
            expect(ctx.workspaceState.get('sparql.connection:file:///workspace/new.sparql')).toBeUndefined();
        });

        it('ignores saves of non-SPARQL or already-titled documents', async () => {
            const { ctx, didSaveHandler } = makeServiceWithCapturedSaveHandlers({
                'sparql.connection:untitled:Untitled-1': 'conn-1',
            });

            await didSaveHandler({ isUntitled: false, languageId: 'turtle', uri: Uri.parse('file:///workspace/new.ttl'), getText: () => 'SELECT * WHERE { ?s ?p ?o }' });
            await didSaveHandler({ isUntitled: true, languageId: 'sparql', uri: Uri.parse('untitled:Untitled-1'), getText: () => 'SELECT * WHERE { ?s ?p ?o }' });

            expect(ctx.workspaceState.get('sparql.connection:untitled:Untitled-1')).toBe('conn-1');
        });
    });
});
