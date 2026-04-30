import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Use vi.hoisted() so statusBarItemMock is available inside the vi.mock factory
// which is hoisted to the top of the file by Vitest.
// ---------------------------------------------------------------------------

const statusBarItemMock = vi.hoisted(() => ({
    text: '',
    show: vi.fn(),
    hide: vi.fn(),
    dispose: vi.fn(),
}));

vi.mock('vscode', async () => {
    const base = await import('@src/utilities/mocks/vscode');
    return {
        ...base,
        StatusBarAlignment: { Left: 1, Right: 2 },
        window: {
            ...base.window,
            createStatusBarItem: vi.fn().mockReturnValue(statusBarItemMock),
        },
    };
});

import type { ISparqlConnectionService, ISparqlQueryService } from '@src/languages/sparql/services';
import { SparqlStatusBarService } from '@src/services/sparql-status-bar-service';
import { EventEmitter } from '@src/utilities/mocks/vscode';
import type { SparqlQueryExecutionState } from '@src/languages/sparql/services/sparql-query-state';
import type { SparqlConnection } from '@src/languages/sparql/services/sparql-connection-state';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeServices() {
    const queryExecutionStartEmitter = new EventEmitter<SparqlQueryExecutionState>();
    const queryExecutionEndEmitter = new EventEmitter<SparqlQueryExecutionState>();
    const connectionTestStartEmitter = new EventEmitter<SparqlConnection>();
    const connectionTestEndEmitter = new EventEmitter<{ connection: SparqlConnection; error: { code: number; message: string } | null }>();

    const queryService = {
        onDidQueryExecutionStart: queryExecutionStartEmitter.event,
        onDidQueryExecutionEnd: queryExecutionEndEmitter.event,
    } as unknown as ISparqlQueryService;

    const connectionService = {
        onDidConnectionTestStart: connectionTestStartEmitter.event,
        onDidConnectionTestEnd: connectionTestEndEmitter.event,
    } as unknown as ISparqlConnectionService;

    return {
        queryService,
        connectionService,
        fireQueryStart: (s: SparqlQueryExecutionState) => queryExecutionStartEmitter.fire(s),
        fireQueryEnd: (s: SparqlQueryExecutionState) => queryExecutionEndEmitter.fire(s),
        fireTestStart: (c: SparqlConnection) => connectionTestStartEmitter.fire(c),
        fireTestEnd: (payload: { connection: SparqlConnection; error: { code: number; message: string } | null }) => connectionTestEndEmitter.fire(payload),
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SparqlStatusBarService', () => {
    beforeEach(() => {
        statusBarItemMock.text = '';
        vi.clearAllMocks();
    });

    describe('query execution', () => {
        it('shows status bar with query name when execution starts', () => {
            const { queryService, connectionService, fireQueryStart } = makeServices();
            new SparqlStatusBarService(queryService, connectionService);

            const state = {
                id: crypto.randomUUID(),
                documentIri: 'file:///test.sparql',
                status: 'running',
            } as unknown as SparqlQueryExecutionState;

            fireQueryStart(state);

            expect(statusBarItemMock.show).toHaveBeenCalled();
            expect(statusBarItemMock.text).toContain('test.sparql');
        });

        it('hides status bar when execution ends', () => {
            const { queryService, connectionService, fireQueryStart, fireQueryEnd } = makeServices();
            new SparqlStatusBarService(queryService, connectionService);

            const state = {
                id: crypto.randomUUID(),
                documentIri: 'file:///test.sparql',
                status: 'complete',
            } as unknown as SparqlQueryExecutionState;

            fireQueryStart(state);
            fireQueryEnd(state);

            expect(statusBarItemMock.hide).toHaveBeenCalled();
        });
    });

    describe('connection testing', () => {
        it('shows status bar with endpoint URL when test starts', () => {
            const { queryService, connectionService, fireTestStart } = makeServices();
            new SparqlStatusBarService(queryService, connectionService);

            const connection = {
                id: 'test-connection',
                label: 'Test',
                endpointUrl: 'https://dbpedia.org/sparql',
            } as SparqlConnection;

            fireTestStart(connection);

            expect(statusBarItemMock.show).toHaveBeenCalled();
            expect(statusBarItemMock.text).toContain('https://dbpedia.org/sparql');
        });

        it('hides status bar when connection test ends successfully', () => {
            const { queryService, connectionService, fireTestStart, fireTestEnd } = makeServices();
            new SparqlStatusBarService(queryService, connectionService);

            const connection = {
                id: 'test-connection',
                label: 'Test',
                endpointUrl: 'https://dbpedia.org/sparql',
            } as SparqlConnection;

            fireTestStart(connection);
            fireTestEnd({ connection, error: null });

            expect(statusBarItemMock.hide).toHaveBeenCalled();
        });

        it('hides status bar when connection test ends with an error', () => {
            const { queryService, connectionService, fireTestStart, fireTestEnd } = makeServices();
            new SparqlStatusBarService(queryService, connectionService);

            const connection = {
                id: 'test-connection',
                label: 'Test',
                endpointUrl: 'https://dbpedia.org/sparql',
            } as SparqlConnection;

            fireTestStart(connection);
            fireTestEnd({ connection, error: { code: 401, message: 'Unauthorized' } });

            expect(statusBarItemMock.hide).toHaveBeenCalled();
        });
    });

    describe('dispose', () => {
        it('disposes status bar item and unsubscribes all event handlers', () => {
            const { queryService, connectionService, fireQueryStart, fireTestStart } = makeServices();
            const service = new SparqlStatusBarService(queryService, connectionService);

            service.dispose();

            // After disposal event handlers should no longer trigger show
            const state = {
                id: crypto.randomUUID(),
                documentIri: 'file:///test.sparql',
                status: 'running',
            } as unknown as SparqlQueryExecutionState;

            const connection = {
                id: 'test-connection',
                label: 'Test',
                endpointUrl: 'https://dbpedia.org/sparql',
            } as SparqlConnection;

            fireQueryStart(state);
            fireTestStart(connection);

            expect(statusBarItemMock.show).not.toHaveBeenCalled();
            expect(statusBarItemMock.dispose).toHaveBeenCalled();
        });
    });
});
