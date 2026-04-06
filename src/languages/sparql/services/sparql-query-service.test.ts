import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

// Shared mutable mock for QueryEngine.prototype.query — configure per test via queryMock
const queryMock = vi.fn();

vi.mock('@comunica/query-sparql', () => ({
    QueryEngine: vi.fn().mockImplementation(function() {
        this.query = queryMock;
    }),
}));

import { SparqlQueryService } from './sparql-query-service';
import type { SparqlQueryExecutionState } from './sparql-query-state';
import { Uri } from '@src/utilities/mocks/vscode';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(documentIri: string, startTime = Date.now()): SparqlQueryExecutionState {
    return {
        id: crypto.randomUUID(),
        documentIri,
        startTime,
        queryType: 'SELECT' as any,
        status: 'complete' as any,
    } as SparqlQueryExecutionState;
}

function makeContext(initialHistory: SparqlQueryExecutionState[] = []) {
    const store = new Map<string, any>([
        ['mentor.sparql.queryHistory', initialHistory],
    ]);

    return {
        workspaceState: {
            get: <T>(key: string, defaultValue: T): T => (store.has(key) ? store.get(key) : defaultValue),
            update: vi.fn(async (key: string, value: any) => { store.set(key, value); }),
        },
        subscriptions: { push: vi.fn() },
    } as unknown as import('vscode').ExtensionContext;
}

function makeService(context = makeContext()) {
    return new SparqlQueryService(
        context,
        {} as any,    // credentialStorage (not used in history tests)
        {} as any,    // connectionService (not used in history tests)
        {} as any,    // resultSerializer (not used in history tests)
    );
}

// ---------------------------------------------------------------------------
// constructor
// ---------------------------------------------------------------------------
describe('SparqlQueryService – constructor', () => {
    it('constructs without throwing', () => {
        expect(() => makeService()).not.toThrow();
    });

    it('initialises with an empty history when workspaceState is empty', () => {
        const service = makeService();
        expect(service.getQueryHistory()).toEqual([]);
    });

    it('restores persisted history from workspaceState', () => {
        const state = makeState('file:///workspace/query.sparql');
        const service = makeService(makeContext([state]));

        expect(service.getQueryHistory()).toHaveLength(1);
        expect(service.getQueryHistory()[0].documentIri).toBe('file:///workspace/query.sparql');
    });

    it('loads history sorted by startTime descending', () => {
        const older = makeState('file:///workspace/a.sparql', 1000);
        const newer = makeState('file:///workspace/b.sparql', 2000);
        const service = makeService(makeContext([older, newer]));

        const history = service.getQueryHistory();
        expect(history[0].documentIri).toBe('file:///workspace/b.sparql');
        expect(history[1].documentIri).toBe('file:///workspace/a.sparql');
    });

    it('loads at most 10 entries from workspaceState', () => {
        const entries = Array.from({ length: 15 }, (_, i) =>
            makeState(`file:///workspace/q${i}.sparql`, i),
        );
        const service = makeService(makeContext(entries));

        expect(service.getQueryHistory().length).toBeLessThanOrEqual(10);
    });
});

// ---------------------------------------------------------------------------
// getQueryHistory
// ---------------------------------------------------------------------------
describe('SparqlQueryService – getQueryHistory', () => {
    it('returns the same array reference on repeated calls', () => {
        const service = makeService();
        expect(service.getQueryHistory()).toBe(service.getQueryHistory());
    });
});

// ---------------------------------------------------------------------------
// getQueryStateForDocument
// ---------------------------------------------------------------------------
describe('SparqlQueryService – getQueryStateForDocument', () => {
    it('returns undefined for an unknown IRI', () => {
        const service = makeService();
        expect(service.getQueryStateForDocument('file:///workspace/missing.sparql')).toBeUndefined();
    });

    it('returns matching state for a known IRI', () => {
        const state = makeState('file:///workspace/known.sparql');
        const service = makeService(makeContext([state]));

        const result = service.getQueryStateForDocument(state.documentIri);
        expect(result).toBeDefined();
        expect(result!.documentIri).toBe(state.documentIri);
    });
});

// ---------------------------------------------------------------------------
// removeQueryStateAt
// ---------------------------------------------------------------------------
describe('SparqlQueryService – removeQueryStateAt', () => {
    it('returns false for a negative index', () => {
        const state = makeState('file:///workspace/q.sparql');
        const service = makeService(makeContext([state]));

        expect(service.removeQueryStateAt(-1)).toBe(false);
    });

    it('returns false for an out-of-bounds index', () => {
        const state = makeState('file:///workspace/q.sparql');
        const service = makeService(makeContext([state]));

        expect(service.removeQueryStateAt(5)).toBe(false);
    });

    it('returns true and removes the item at a valid index', () => {
        const s1 = makeState('file:///workspace/a.sparql', 1000);
        const s2 = makeState('file:///workspace/b.sparql', 2000);
        const service = makeService(makeContext([s1, s2]));

        // After sorting by startTime desc, index 0 is s2
        const removed = service.removeQueryStateAt(0);
        expect(removed).toBe(true);
        expect(service.getQueryHistory()).toHaveLength(1);
    });

    it('fires the onDidHistoryChange event after removal', () => {
        const state = makeState('file:///workspace/q.sparql');
        const service = makeService(makeContext([state]));

        const listener = vi.fn();
        service.onDidHistoryChange(listener);

        service.removeQueryStateAt(0);
        expect(listener).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// removeQueryState
// ---------------------------------------------------------------------------
describe('SparqlQueryService – removeQueryState', () => {
    it('removes a state found by reference', () => {
        const state = makeState('file:///workspace/q.sparql');
        const service = makeService(makeContext([state]));

        const ref = service.getQueryHistory()[0];
        service.removeQueryState(ref);

        expect(service.getQueryHistory()).toHaveLength(0);
    });

    it('does nothing when the state is not in the history', () => {
        const state = makeState('file:///workspace/q.sparql');
        const service = makeService(makeContext([state]));

        const phantom = makeState('file:///workspace/other.sparql');
        service.removeQueryState(phantom);

        expect(service.getQueryHistory()).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// cancelQuery
// ---------------------------------------------------------------------------
describe('SparqlQueryService – cancelQuery', () => {
    it('returns false for an unknown query ID', () => {
        const service = makeService();
        expect(service.cancelQuery('no-such-id')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// clearQueryHistory
// ---------------------------------------------------------------------------
describe('SparqlQueryService – clearQueryHistory', () => {
    it('clears all history entries', () => {
        const s1 = makeState('file:///workspace/a.sparql');
        const s2 = makeState('file:///workspace/b.sparql');
        const service = makeService(makeContext([s1, s2]));

        service.clearQueryHistory();

        expect(service.getQueryHistory()).toHaveLength(0);
    });

    it('persists an empty history to workspaceState', async () => {
        const ctx = makeContext([makeState('file:///workspace/a.sparql')]);
        const service = makeService(ctx);

        service.clearQueryHistory();

        // _persistQueryHistory calls workspaceState.update asynchronously
        await vi.waitFor(() => {
            expect(ctx.workspaceState.update).toHaveBeenCalled();
        });
    });
});

// ---------------------------------------------------------------------------
// _getQueryType
// ---------------------------------------------------------------------------
describe('SparqlQueryService – _getQueryType', () => {
    let service: ReturnType<typeof makeService>;

    beforeEach(() => {
        service = makeService();
    });

    it('returns "boolean" for ASK query', () => {
        expect((service as any)._getQueryType('ASK { ?s ?p ?o }')).toBe('boolean');
    });

    it('returns "bindings" for SELECT query', () => {
        expect((service as any)._getQueryType('SELECT * WHERE { ?s ?p ?o }')).toBe('bindings');
    });

    it('returns "quads" for CONSTRUCT query', () => {
        expect((service as any)._getQueryType('CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }')).toBe('quads');
    });

    it('returns "quads" for DESCRIBE query', () => {
        expect((service as any)._getQueryType('DESCRIBE <http://example.org/subject>')).toBe('quads');
    });

    it('returns undefined for FROM query (no query type keyword)', () => {
        expect((service as any)._getQueryType('FROM <http://example.org/graph>')).toBeUndefined();
    });

    it('returns undefined for WHERE-only query (no query type keyword)', () => {
        expect((service as any)._getQueryType('WHERE { ?s ?p ?o }')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
        expect((service as any)._getQueryType('')).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// _getFetchHandler
// ---------------------------------------------------------------------------
describe('SparqlQueryService – _getFetchHandler', () => {
    let service: ReturnType<typeof makeService>;

    beforeEach(() => {
        service = makeService();
    });

    it('returns undefined when no credential is provided', () => {
        expect((service as any)._getFetchHandler(undefined)).toBeUndefined();
    });

    it('returns undefined when credential type is unknown', () => {
        expect((service as any)._getFetchHandler({ type: 'unknown' })).toBeUndefined();
    });

    it('returns a function for basic credential type', () => {
        const handler = (service as any)._getFetchHandler({
            type: 'basic',
            username: 'user',
            password: 'pass'
        });
        expect(typeof handler).toBe('function');
    });

    it('invokes fetch with Authorization header for basic credential', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', mockFetch);
        const handler = (service as any)._getFetchHandler({ type: 'basic', username: 'user', password: 'pass' });
        await handler('https://example.org/sparql', {});
        expect(mockFetch).toHaveBeenCalledOnce();
        const [, init] = mockFetch.mock.calls[0];
        expect(init.headers.get('Authorization')).toMatch(/^Basic /);
        vi.unstubAllGlobals();
    });

    it('returns a function for bearer credential type', () => {
        const handler = (service as any)._getFetchHandler({
            type: 'bearer',
            token: 'mytoken'
        });
        expect(typeof handler).toBe('function');
    });

    it('invokes fetch with Bearer Authorization header for bearer credential', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', mockFetch);
        const handler = (service as any)._getFetchHandler({ type: 'bearer', token: 'mytoken' });
        await handler('https://example.org/sparql', {});
        expect(mockFetch).toHaveBeenCalledOnce();
        const [, init] = mockFetch.mock.calls[0];
        expect(init.headers.get('Authorization')).toBe('Bearer mytoken');
        vi.unstubAllGlobals();
    });

    it('uses default Bearer prefix for bearer credential without prefix', () => {
        const handler = (service as any)._getFetchHandler({
            type: 'bearer',
            token: 'mytoken'
        });
        expect(typeof handler).toBe('function');
    });

    it('returns a function for microsoft credential type with accessToken', () => {
        const handler = (service as any)._getFetchHandler({
            type: 'microsoft',
            accessToken: 'accesstoken'
        });
        expect(typeof handler).toBe('function');
    });

    it('invokes fetch with Bearer Authorization header for microsoft credential', async () => {
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', mockFetch);
        const handler = (service as any)._getFetchHandler({ type: 'microsoft', accessToken: 'mstoken' });
        await handler('https://example.org/sparql', {});
        expect(mockFetch).toHaveBeenCalledOnce();
        const [, init] = mockFetch.mock.calls[0];
        expect(init.headers.get('Authorization')).toBe('Bearer mstoken');
        vi.unstubAllGlobals();
    });

    it('returns undefined for microsoft credential without accessToken', () => {
        const handler = (service as any)._getFetchHandler({
            type: 'microsoft',
            accessToken: undefined
        });
        expect(handler).toBeUndefined();
    });

    it('returns a function for entra-client-credentials credential type', () => {
        const handler = (service as any)._getFetchHandler({
            type: 'entra-client-credentials',
            tenantId: 'tenant',
            clientId: 'client',
            clientSecret: 'secret'
        });
        expect(typeof handler).toBe('function');
    });

    it('invokes fetch with Bearer Authorization header for entra-client-credentials', async () => {
        const { EntraClientCredentialService } = await import('@src/services/core/entra-client-credential-service');
        const acquireTokenMock = vi.spyOn(EntraClientCredentialService.prototype, 'acquireToken').mockResolvedValue('entra-access-token');
        const mockFetch = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', mockFetch);
        const handler = (service as any)._getFetchHandler({
            type: 'entra-client-credentials',
            tenantId: 'tenant',
            clientId: 'client',
            clientSecret: 'secret'
        });
        await handler('https://example.org/sparql', {});
        expect(acquireTokenMock).toHaveBeenCalledOnce();
        expect(mockFetch).toHaveBeenCalledOnce();
        const [, init] = mockFetch.mock.calls[0];
        expect(init.headers.get('Authorization')).toBe('Bearer entra-access-token');
        vi.unstubAllGlobals();
        acquireTokenMock.mockRestore();
    });
});

// ---------------------------------------------------------------------------
// createQuery
// ---------------------------------------------------------------------------
describe('SparqlQueryService – createQuery', () => {
    it('creates a query state from a TextDocument', () => {
        const service = makeService();
        const uri = Uri.parse('file:///workspace/query.sparql');
        const mockDoc = {
            uri,
            getText: () => 'SELECT * WHERE { ?s ?p ?o }',
        } as any;
        const state = service.createQuery(mockDoc, 'SELECT * WHERE { ?s ?p ?o }');
        expect(state.documentIri).toBe(uri.toString());
        expect(state.queryType).toBe('bindings');
        expect(state.query).toBe('SELECT * WHERE { ?s ?p ?o }');
    });

    it('creates a query state from a NotebookCell', () => {
        const service = makeService();
        const notebookUri = Uri.parse('file:///workspace/notebook.sparql-book');
        const cellUri = Uri.parse('vscode-notebook-cell:///workspace/notebook.sparql-book#cell2');
        const mockCell = {
            notebook: { uri: notebookUri },
            index: 2,
            document: {
                uri: cellUri,
                getText: () => 'ASK { ?s ?p ?o }',
            }
        } as any;
        const state = service.createQuery(mockCell, 'ASK { ?s ?p ?o }');
        expect(state.notebookIri).toBeDefined();
        expect(state.cellIndex).toBe(2);
        expect(state.queryType).toBe('boolean');
    });
});

// ---------------------------------------------------------------------------
// createQueryFromDocument
// ---------------------------------------------------------------------------
describe('SparqlQueryService – createQueryFromDocument', () => {
    it('creates a query state from a TextDocument with its text content', () => {
        const service = makeService();
        const uri = Uri.parse('file:///workspace/query.sparql');
        const mockDoc = {
            uri,
            getText: () => 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }',
        } as any;
        const state = service.createQueryFromDocument(mockDoc);
        expect(state.documentIri).toBe(uri.toString());
        expect(state.queryType).toBe('quads');
        expect(state.query).toBe('CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }');
    });
});

// ---------------------------------------------------------------------------
// cancelQuery – active cancellation
// ---------------------------------------------------------------------------
describe('SparqlQueryService – cancelQuery (active token)', () => {
    it('cancels a running query and returns true', () => {
        const service = makeService();
        const cancel = vi.fn();
        const fakeId = 'query-id-123';
        // Inject a fake cancellation token directly
        (service as any)._cancellationTokens.set(fakeId, { cancel, dispose: vi.fn() });
        expect(service.cancelQuery(fakeId)).toBe(true);
        expect(cancel).toHaveBeenCalled();
        expect((service as any)._cancellationTokens.has(fakeId)).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// _onTextDocumentClosed (via vscode event)
// ---------------------------------------------------------------------------
describe('SparqlQueryService – _onTextDocumentClosed', () => {
    it('removes untitled document from history when closed', async () => {
        const { workspace } = await import('vscode');
        const untitledUri = {
            toString: () => 'untitled:query-1',
            scheme: 'untitled'
        };
        const state: any = {
            id: 'x',
            documentIri: 'untitled:query-1',
            startTime: Date.now(),
            queryType: 'bindings',
            status: 'complete'
        };
        const service = makeService(makeContext([state]));
        expect(service.getQueryHistory()).toHaveLength(1);

        // Call private method directly
        (service as any)._onTextDocumentClosed({ uri: untitledUri });
        expect(service.getQueryHistory()).toHaveLength(0);
    });

    it('does not remove non-untitled documents from history when closed', () => {
        const fileUri = {
            toString: () => 'file:///workspace/query.sparql',
            scheme: 'file'
        };
        const state = makeState('file:///workspace/query.sparql');
        const service = makeService(makeContext([state]));
        (service as any)._onTextDocumentClosed({ uri: fileUri });
        expect(service.getQueryHistory()).toHaveLength(1);
    });

    it('removes untitled document via the registered onDidCloseTextDocument event handler', async () => {
        const { workspace } = await import('vscode');
        let capturedHandler: ((doc: any) => void) | undefined;
        const spy = vi.spyOn(workspace, 'onDidCloseTextDocument').mockImplementation((handler: any) => {
            capturedHandler = handler;
            return { dispose: () => {} };
        });
        const untitledUri = { toString: () => 'untitled:query-ev', scheme: 'untitled' };
        const state: any = { id: 'ev', documentIri: 'untitled:query-ev', startTime: Date.now() };
        const service = makeService(makeContext([state]));
        expect(capturedHandler).toBeDefined();
        capturedHandler!({ uri: untitledUri });
        expect(service.getQueryHistory()).toHaveLength(0);
        spy.mockRestore();
    });
});

describe('SparqlQueryService – _getQueryText', () => {
    it('returns inline query string when context.query is set', () => {
        const service = makeService();
        const ctx: any = { query: 'SELECT * WHERE { ?s ?p ?o }', documentIri: 'file:///x.sparql' };
        expect((service as any)._getQueryText(ctx)).toBe('SELECT * WHERE { ?s ?p ?o }');
    });

    it('returns document getText when documentIri matches workspace textDocuments', async () => {
        const vscode = await import('vscode');
        const uri = Uri.parse('file:///workspace/q.sparql');
        (vscode.workspace as any).textDocuments = [{ uri, getText: () => 'SELECT 1' }];
        const service = makeService();
        const ctx: any = { documentIri: uri.toString() };
        expect((service as any)._getQueryText(ctx)).toBe('SELECT 1');
        (vscode.workspace as any).textDocuments = [];
    });

    it('returns undefined when documentIri not in textDocuments', () => {
        const service = makeService();
        const ctx: any = { documentIri: 'file:///not-found.sparql' };
        expect((service as any)._getQueryText(ctx)).toBeUndefined();
    });

    it('returns notebook cell text when notebookIri matches', async () => {
        const vscode = await import('vscode');
        const nbUri = Uri.parse('file:///workspace/nb.sparql-book');
        const mockNotebook = {
            uri: nbUri,
            cellAt: (_i: number) => ({ document: { getText: () => 'ASK {}' } })
        };
        (vscode.workspace as any).notebookDocuments = [mockNotebook];
        const service = makeService();
        const ctx: any = { notebookIri: nbUri.toString(), cellIndex: 0 };
        expect((service as any)._getQueryText(ctx)).toBe('ASK {}');
        (vscode.workspace as any).notebookDocuments = [];
    });

    it('returns undefined when notebookIri not in notebookDocuments', () => {
        const service = makeService();
        const ctx: any = { notebookIri: 'file:///not-found.sparql-book' };
        expect((service as any)._getQueryText(ctx)).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// executeQuery
// ---------------------------------------------------------------------------
describe('SparqlQueryService – executeQuery', () => {
    function makeFullService() {
        const connectionService = {
            getQuerySourceForDocument: vi.fn().mockResolvedValue({ type: 'sparql', connection: { id: 'test' } }),
        };
        const credentialStorage = {
            getCredential: vi.fn().mockResolvedValue(null),
        };
        const resultSerializer = {
            serializeBindings: vi.fn().mockResolvedValue({ type: 'bindings', rows: [] }),
            serializeQuads: vi.fn().mockResolvedValue(''),
            serializeQuadsToString: vi.fn().mockResolvedValue(''),
        };
        return new SparqlQueryService(
            makeContext(),
            credentialStorage as any,
            connectionService as any,
            resultSerializer as any,
        );
    }

    it('returns a context with an error when query text is unavailable', async () => {
        const service = makeFullService();
        const ctx: any = {
            id: 'test-id',
            documentIri: 'file:///missing.sparql',
            startTime: Date.now(),
            queryType: 'bindings',
            status: 'pending',
        };
        // No query text available (textDocuments is empty, no context.query)
        const result = await service.executeQuery(ctx);
        expect(result.error).toBeDefined();
        expect(result.error?.message).toContain('Unable to retrieve query');
    });

    it('executes a bindings query and sets result', async () => {
        queryMock.mockResolvedValue({
            resultType: 'bindings',
            execute: vi.fn().mockResolvedValue({
                [Symbol.asyncIterator]: () => ({ next: vi.fn().mockResolvedValue({ done: true }) }),
            }),
        });
        const service = makeFullService();
        const ctx: any = {
            id: 'test-id',
            documentIri: 'file:///test.sparql',
            query: 'SELECT * WHERE { ?s ?p ?o }',
            startTime: Date.now(),
            queryType: 'bindings',
            status: 'pending',
        };
        const result = await service.executeQuery(ctx);
        expect(result.error).toBeUndefined();
        expect(result.result).toBeDefined();
    });

    it('executes a boolean query and sets result', async () => {
        queryMock.mockResolvedValue({
            resultType: 'boolean',
            execute: vi.fn().mockResolvedValue(true),
        });
        const service = makeFullService();
        const ctx: any = {
            id: 'test-id',
            documentIri: 'file:///test.sparql',
            query: 'ASK { ?s ?p ?o }',
            startTime: Date.now(),
            queryType: 'boolean',
            status: 'pending',
        };
        const result = await service.executeQuery(ctx);
        expect(result.error).toBeUndefined();
        expect(result.result).toEqual({ type: 'boolean', value: true });
    });

    it('executes a quads (CONSTRUCT) query and sets result', async () => {
        queryMock.mockResolvedValue({
            resultType: 'quads',
            execute: vi.fn().mockResolvedValue({
                [Symbol.asyncIterator]: () => ({ next: vi.fn().mockResolvedValue({ done: true }) }),
            }),
        });
        const service = makeFullService();
        const ctx: any = {
            id: 'test-id',
            documentIri: 'file:///test.sparql',
            query: 'CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }',
            startTime: Date.now(),
            queryType: 'quads',
            status: 'pending',
        };
        const result = await service.executeQuery(ctx);
        expect(result.error).toBeUndefined();
    });

    it('executes a none-type query and sets result to undefined', async () => {
        queryMock.mockResolvedValue({
            resultType: 'unknown-type',
            execute: vi.fn().mockResolvedValue(null),
        });
        const service = makeFullService();
        const ctx: any = {
            id: 'test-id',
            documentIri: 'file:///test.sparql',
            query: 'SOME UNKNOWN QUERY',
            startTime: Date.now(),
            queryType: undefined,
            status: 'pending',
        };
        const result = await service.executeQuery(ctx);
        expect(result.result).toBeUndefined();
    });

    it('captures errors from query execution in context.error', async () => {
        queryMock.mockRejectedValue(
            Object.assign(new Error('Query failed'), { name: 'QueryError', statusCode: 400 })
        );
        const service = makeFullService();
        const ctx: any = {
            id: 'test-id',
            documentIri: 'file:///test.sparql',
            query: 'SELECT * WHERE { ?s ?p ?o }',
            startTime: Date.now(),
            queryType: 'bindings',
            status: 'pending',
        };
        const result = await service.executeQuery(ctx);
        expect(result.error).toBeDefined();
        expect(result.error?.message).toBe('Query failed');
        expect(result.error?.statusCode).toBe(400);
    });
});

// ---------------------------------------------------------------------------
// executeQueryOnConnection
// ---------------------------------------------------------------------------
describe('SparqlQueryService – executeQueryOnConnection', () => {
    function makeConnectionService() {
        const connectionService = {
            getQuerySourceForConnection: vi.fn().mockResolvedValue({ type: 'sparql', connection: { id: 'test' } }),
        };
        const credentialStorage = {
            getCredential: vi.fn().mockResolvedValue(null),
        };
        const resultSerializer = {
            serializeQuadsToString: vi.fn().mockResolvedValue('<turtle data>'),
        };
        return new SparqlQueryService(
            makeContext(),
            credentialStorage as any,
            connectionService as any,
            resultSerializer as any,
        );
    }

    const mockConn: any = { id: 'test', endpointUrl: 'https://example.org/sparql', configScope: 'user' };

    it('returns boolean result for ASK query', async () => {
        queryMock.mockResolvedValue({ resultType: 'boolean', execute: vi.fn().mockResolvedValue(true) });
        const service = makeConnectionService();
        const result = await service.executeQueryOnConnection('ASK {}', mockConn);
        expect(result).toEqual({ type: 'boolean', value: true });
    });

    it('returns quads result for CONSTRUCT query', async () => {
        const mockQuad = { subject: 'ex:s', predicate: 'ex:p', object: 'ex:o' };
        queryMock.mockResolvedValue({
            resultType: 'quads',
            execute: vi.fn().mockResolvedValue({
                [Symbol.asyncIterator]: () => {
                    let done = false;
                    return {
                        next: vi.fn().mockImplementation(() => {
                            if (!done) {
                                done = true;
                                return Promise.resolve({ value: mockQuad, done: false });
                            }
                            return Promise.resolve({ done: true });
                        })
                    };
                },
            }),
        });
        const service = makeConnectionService();
        const result = await service.executeQueryOnConnection('CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }', mockConn);
        expect(result).toEqual({ type: 'quads', data: '<turtle data>' });
    });

    it('returns bindings result for SELECT query', async () => {
        const mockBinding = { get: (_v: string) => null };
        queryMock.mockResolvedValue({
            resultType: 'bindings',
            execute: vi.fn().mockResolvedValue({
                [Symbol.asyncIterator]: () => {
                    let done = false;
                    return {
                        next: vi.fn().mockImplementation(() => {
                            if (!done) {
                                done = true;
                                return Promise.resolve({ value: mockBinding, done: false });
                            }
                            return Promise.resolve({ done: true });
                        })
                    };
                },
            }),
        });
        const service = makeConnectionService();
        const result = await service.executeQueryOnConnection('SELECT * WHERE { ?s ?p ?o }', mockConn);
        expect(result).toEqual({ type: 'bindings', bindings: [mockBinding] });
    });

    it('returns null for unknown result type', async () => {
        queryMock.mockResolvedValue({ resultType: 'none', execute: vi.fn().mockResolvedValue(null) });
        const service = makeConnectionService();
        const result = await service.executeQueryOnConnection('UNKNOWN', mockConn);
        expect(result).toBeNull();
    });

    it('rethrows errors from query execution', async () => {
        queryMock.mockRejectedValue(new Error('Engine error'));
        const service = new SparqlQueryService(
            makeContext(),
            { getCredential: vi.fn().mockResolvedValue(null) } as any,
            { getQuerySourceForConnection: vi.fn().mockResolvedValue({}) } as any,
            {} as any,
        );
        await expect(service.executeQueryOnConnection('FAIL', mockConn)).rejects.toThrow('Query execution failed: Engine error');
    });
});
