import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Use vi.hoisted() so the created-items registry is available inside the
// vi.mock factory which is hoisted to the top of the file by Vitest.
// ---------------------------------------------------------------------------

const statusBar = vi.hoisted(() => {
    const createdItems: any[] = [];

    const createStatusBarItem = vi.fn((_alignment: number, priority: number) => {
        const item = {
            priority,
            text: '',
            tooltip: '',
            command: undefined as unknown,
            show: vi.fn(),
            hide: vi.fn(),
            dispose: vi.fn(),
        };
        createdItems.push(item);
        return item;
    });

    return { createdItems, createStatusBarItem };
});

vi.mock('vscode', async () => {
    const base = await import('@src/utilities/mocks/vscode');
    return {
        ...base,
        StatusBarAlignment: { Left: 1, Right: 2 },
        window: {
            ...base.window,
            createStatusBarItem: statusBar.createStatusBarItem,
        },
    };
});

import type { ISparqlConnectionRegistry, ISparqlQueryService, IGraphManagementService } from '@src/languages/sparql/services';
import { SparqlStatusBarService } from '@src/languages/sparql/services/sparql-status-bar-service';
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
    const graphLoadStartEmitter = new EventEmitter<void>();
    const graphLoadEndEmitter = new EventEmitter<void>();

    const queryService = {
        onDidQueryExecutionStart: queryExecutionStartEmitter.event,
        onDidQueryExecutionEnd: queryExecutionEndEmitter.event,
    } as unknown as ISparqlQueryService;

    const connectionRegistry = {
        onDidConnectionTestStart: connectionTestStartEmitter.event,
        onDidConnectionTestEnd: connectionTestEndEmitter.event,
    } as unknown as ISparqlConnectionRegistry;

    const graphService = {
        onDidGraphLoadStart: graphLoadStartEmitter.event,
        onDidGraphLoadEnd: graphLoadEndEmitter.event,
    } as unknown as IGraphManagementService;

    return {
        queryService,
        connectionRegistry,
        graphService,
        fireQueryStart: (s: SparqlQueryExecutionState) => queryExecutionStartEmitter.fire(s),
        fireQueryEnd: (s: SparqlQueryExecutionState) => queryExecutionEndEmitter.fire(s),
        fireTestStart: (c: SparqlConnection) => connectionTestStartEmitter.fire(c),
        fireTestEnd: (payload: { connection: SparqlConnection; error: { code: number; message: string } | null }) => connectionTestEndEmitter.fire(payload),
        fireGraphLoadStart: () => graphLoadStartEmitter.fire(),
        fireGraphLoadEnd: () => graphLoadEndEmitter.fire(),
    };
}

/** The single SPARQL status bar item. */
const sparqlItem = () => statusBar.createdItems[0];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SparqlStatusBarService', () => {
    beforeEach(() => {
        statusBar.createdItems.length = 0;
        vi.clearAllMocks();
    });

    describe('default state', () => {
        it('is permanently visible with the SPARQL label and opens the panel on click', () => {
            const { queryService, connectionRegistry, graphService } = makeServices();
            new SparqlStatusBarService(queryService, connectionRegistry, graphService);

            expect(sparqlItem().show).toHaveBeenCalled();
            expect(sparqlItem().text).toBe('$(sparql-file) SPARQL');
            expect(sparqlItem().command).toBe('mentor.view.sparqlResultsView.focus');
        });

        it('creates a single status bar item', () => {
            const { queryService, connectionRegistry, graphService } = makeServices();
            new SparqlStatusBarService(queryService, connectionRegistry, graphService);

            expect(statusBar.createdItems).toHaveLength(1);
        });
    });

    describe('query execution', () => {
        it('shows status bar with query name when execution starts', () => {
            const { queryService, connectionRegistry, graphService, fireQueryStart } = makeServices();
            new SparqlStatusBarService(queryService, connectionRegistry, graphService);

            const state = {
                id: crypto.randomUUID(),
                documentIri: 'file:///test.sparql',
                status: 'running',
            } as unknown as SparqlQueryExecutionState;

            fireQueryStart(state);

            expect(sparqlItem().show).toHaveBeenCalled();
            expect(sparqlItem().text).toContain('test.sparql');
        });

        it('reverts to the SPARQL label when execution ends', () => {
            const { queryService, connectionRegistry, graphService, fireQueryStart, fireQueryEnd } = makeServices();
            new SparqlStatusBarService(queryService, connectionRegistry, graphService);

            const state = {
                id: crypto.randomUUID(),
                documentIri: 'file:///test.sparql',
                status: 'complete',
            } as unknown as SparqlQueryExecutionState;

            fireQueryStart(state);
            fireQueryEnd(state);

            expect(sparqlItem().text).toBe('$(sparql-file) SPARQL');
            expect(sparqlItem().hide).not.toHaveBeenCalled();
        });
    });

    describe('connection testing', () => {
        it('shows status bar with endpoint URL when test starts', () => {
            const { queryService, connectionRegistry, graphService, fireTestStart } = makeServices();
            new SparqlStatusBarService(queryService, connectionRegistry, graphService);

            const connection = {
                id: 'test-connection',
                label: 'Test',
                endpointUrl: 'https://dbpedia.org/sparql',
            } as SparqlConnection;

            fireTestStart(connection);

            expect(sparqlItem().show).toHaveBeenCalled();
            expect(sparqlItem().text).toContain('https://dbpedia.org/sparql');
        });

        it('reverts to the SPARQL label when connection test ends successfully', () => {
            const { queryService, connectionRegistry, graphService, fireTestStart, fireTestEnd } = makeServices();
            new SparqlStatusBarService(queryService, connectionRegistry, graphService);

            const connection = {
                id: 'test-connection',
                label: 'Test',
                endpointUrl: 'https://dbpedia.org/sparql',
            } as SparqlConnection;

            fireTestStart(connection);
            fireTestEnd({ connection, error: null });

            expect(sparqlItem().text).toBe('$(sparql-file) SPARQL');
            expect(sparqlItem().hide).not.toHaveBeenCalled();
        });

        it('reverts to the SPARQL label when connection test ends with an error', () => {
            const { queryService, connectionRegistry, graphService, fireTestStart, fireTestEnd } = makeServices();
            new SparqlStatusBarService(queryService, connectionRegistry, graphService);

            const connection = {
                id: 'test-connection',
                label: 'Test',
                endpointUrl: 'https://dbpedia.org/sparql',
            } as SparqlConnection;

            fireTestStart(connection);
            fireTestEnd({ connection, error: { code: 401, message: 'Unauthorized' } });

            expect(sparqlItem().text).toBe('$(sparql-file) SPARQL');
            expect(sparqlItem().hide).not.toHaveBeenCalled();
        });
    });

    describe('graph loading', () => {
        it('shows graph-loading progress on the single item and reverts when done', () => {
            const { queryService, connectionRegistry, graphService, fireGraphLoadStart, fireGraphLoadEnd } = makeServices();
            new SparqlStatusBarService(queryService, connectionRegistry, graphService);

            fireGraphLoadStart();

            expect(sparqlItem().text).toContain('Loading graphs');

            fireGraphLoadEnd();

            expect(sparqlItem().text).toBe('$(sparql-file) SPARQL');
            expect(sparqlItem().hide).not.toHaveBeenCalled();
        });

        it('composes query execution and graph loading into one label at the same time', () => {
            const { queryService, connectionRegistry, graphService, fireQueryStart, fireGraphLoadStart } = makeServices();
            new SparqlStatusBarService(queryService, connectionRegistry, graphService);

            const state = {
                id: crypto.randomUUID(),
                documentIri: 'file:///test.sparql',
                status: 'running',
            } as unknown as SparqlQueryExecutionState;

            fireQueryStart(state);
            fireGraphLoadStart();

            // Both activities are visible on the one item simultaneously.
            expect(sparqlItem().text).toContain('test.sparql');
            expect(sparqlItem().text).toContain('Loading graphs');
        });
    });

    describe('dispose', () => {
        it('disposes the status bar item and unsubscribes all event handlers', () => {
            const { queryService, connectionRegistry, graphService, fireQueryStart, fireTestStart } = makeServices();
            const service = new SparqlStatusBarService(queryService, connectionRegistry, graphService);

            const main = sparqlItem();

            service.dispose();

            // Ignore the show() from the default label set during construction.
            main.show.mockClear();

            // After disposal event handlers should no longer trigger show.
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

            expect(main.show).not.toHaveBeenCalled();
            expect(main.dispose).toHaveBeenCalled();
        });
    });
});
