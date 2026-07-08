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

import type { ISparqlConnectionRegistry, ISparqlEndpointTester, ISparqlQueryService, IGraphManagementService } from '@src/languages/sparql/services';
import { SparqlStatusBarService } from '@src/languages/sparql/services/sparql-status-bar-service';
import { EventEmitter } from '@src/utilities/mocks/vscode';
import type { SparqlQueryExecutionState } from '@src/languages/sparql/services/sparql-query-state';
import type { SparqlConnection } from '@src/languages/sparql/services/sparql-connection';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeServices() {
    const queryExecutionStartEmitter = new EventEmitter<SparqlQueryExecutionState>();
    const queryExecutionEndEmitter = new EventEmitter<SparqlQueryExecutionState>();
    const connectionTestStartEmitter = new EventEmitter<SparqlConnection>();
    const connectionTestEndEmitter = new EventEmitter<{ connection: SparqlConnection; error: { code: number; message: string } | null }>();
    const graphLoadStartEmitter = new EventEmitter<SparqlConnection>();
    const graphLoadEndEmitter = new EventEmitter<SparqlConnection>();

    const queryService = {
        onDidQueryExecutionStart: queryExecutionStartEmitter.event,
        onDidQueryExecutionEnd: queryExecutionEndEmitter.event,
    } as unknown as ISparqlQueryService;

    const endpointTester = {
        onDidConnectionTestStart: connectionTestStartEmitter.event,
        onDidConnectionTestEnd: connectionTestEndEmitter.event,
    } as unknown as ISparqlEndpointTester;

    const connectionsChangedEmitter = new EventEmitter<void>();
    const graphsChangedEmitter = new EventEmitter<string>();

    const connections: { id: string }[] = [];
    const graphsByConnection: Record<string, string[]> = {};

    const connectionRegistry = {
        onDidChangeConnections: connectionsChangedEmitter.event,
        getConnections: () => connections,
    } as unknown as ISparqlConnectionRegistry;

    const graphService = {
        onDidGraphLoadStart: graphLoadStartEmitter.event,
        onDidGraphLoadEnd: graphLoadEndEmitter.event,
        onDidChangeGraphs: graphsChangedEmitter.event,
        getGraphsForConnection: (id: string) => graphsByConnection[id] ?? [],
    } as unknown as IGraphManagementService;

    return {
        queryService,
        endpointTester,
        connectionRegistry,
        graphService,
        connections,
        graphsByConnection,
        fireConnectionsChanged: () => connectionsChangedEmitter.fire(),
        fireGraphsChanged: (id: string) => graphsChangedEmitter.fire(id),
        fireQueryStart: (s: SparqlQueryExecutionState) => queryExecutionStartEmitter.fire(s),
        fireQueryEnd: (s: SparqlQueryExecutionState) => queryExecutionEndEmitter.fire(s),
        fireTestStart: (c: SparqlConnection) => connectionTestStartEmitter.fire(c),
        fireTestEnd: (payload: { connection: SparqlConnection; error: { code: number; message: string } | null }) => connectionTestEndEmitter.fire(payload),
        fireGraphLoadStart: (c: SparqlConnection) => graphLoadStartEmitter.fire(c),
        fireGraphLoadEnd: (c: SparqlConnection) => graphLoadEndEmitter.fire(c),
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
        it('is permanently visible with the connection summary and opens the panel on click', () => {
            const { queryService, endpointTester, connectionRegistry, graphService } = makeServices();
            new SparqlStatusBarService(queryService, endpointTester, graphService, connectionRegistry);

            expect(sparqlItem().show).toHaveBeenCalled();
            expect(sparqlItem().text).toBe('$(arrow-swap) 0 connections; 0 graphs');
            expect(sparqlItem().command).toBe('mentor.view.sparqlResultsView.focus');
        });

        it('creates a single status bar item', () => {
            const { queryService, endpointTester, connectionRegistry, graphService } = makeServices();
            new SparqlStatusBarService(queryService, endpointTester, graphService, connectionRegistry);

            expect(statusBar.createdItems).toHaveLength(1);
        });
    });

    describe('query execution', () => {
        it('shows status bar with query name when execution starts', () => {
            const { queryService, endpointTester, connectionRegistry, graphService, fireQueryStart } = makeServices();
            new SparqlStatusBarService(queryService, endpointTester, graphService, connectionRegistry);

            const state = {
                id: crypto.randomUUID(),
                documentIri: 'file:///test.sparql',
                status: 'running',
            } as unknown as SparqlQueryExecutionState;

            fireQueryStart(state);

            expect(sparqlItem().show).toHaveBeenCalled();
            expect(sparqlItem().text).toContain('test.sparql');
        });

        it('reverts to the summary label when execution ends', () => {
            const { queryService, endpointTester, connectionRegistry, graphService, fireQueryStart, fireQueryEnd } = makeServices();
            new SparqlStatusBarService(queryService, endpointTester, graphService, connectionRegistry);

            const state = {
                id: crypto.randomUUID(),
                documentIri: 'file:///test.sparql',
                status: 'complete',
            } as unknown as SparqlQueryExecutionState;

            fireQueryStart(state);
            fireQueryEnd(state);

            expect(sparqlItem().text).toBe('$(arrow-swap) 0 connections; 0 graphs');
            expect(sparqlItem().hide).not.toHaveBeenCalled();
        });
    });

    describe('connection testing', () => {
        it('shows status bar with endpoint URL when test starts', () => {
            const { queryService, endpointTester, connectionRegistry, graphService, fireTestStart } = makeServices();
            new SparqlStatusBarService(queryService, endpointTester, graphService, connectionRegistry);

            const connection = {
                id: 'test-connection',
                label: 'Test',
                endpointUrl: 'https://dbpedia.org/sparql',
            } as SparqlConnection;

            fireTestStart(connection);

            expect(sparqlItem().show).toHaveBeenCalled();
            expect(sparqlItem().text).toContain('https://dbpedia.org/sparql');
        });

        it('reverts to the summary label when connection test ends successfully', () => {
            const { queryService, endpointTester, connectionRegistry, graphService, fireTestStart, fireTestEnd } = makeServices();
            new SparqlStatusBarService(queryService, endpointTester, graphService, connectionRegistry);

            const connection = {
                id: 'test-connection',
                label: 'Test',
                endpointUrl: 'https://dbpedia.org/sparql',
            } as SparqlConnection;

            fireTestStart(connection);
            fireTestEnd({ connection, error: null });

            expect(sparqlItem().text).toBe('$(arrow-swap) 0 connections; 0 graphs');
            expect(sparqlItem().hide).not.toHaveBeenCalled();
        });

        it('reverts to the summary label when connection test ends with an error', () => {
            const { queryService, endpointTester, connectionRegistry, graphService, fireTestStart, fireTestEnd } = makeServices();
            new SparqlStatusBarService(queryService, endpointTester, graphService, connectionRegistry);

            const connection = {
                id: 'test-connection',
                label: 'Test',
                endpointUrl: 'https://dbpedia.org/sparql',
            } as SparqlConnection;

            fireTestStart(connection);
            fireTestEnd({ connection, error: { code: 401, message: 'Unauthorized' } });

            expect(sparqlItem().text).toBe('$(arrow-swap) 0 connections; 0 graphs');
            expect(sparqlItem().hide).not.toHaveBeenCalled();
        });
    });

    describe('graph loading', () => {
        it('shows the URL of the connection being loaded and reverts when done', () => {
            const { queryService, endpointTester, connectionRegistry, graphService, fireGraphLoadStart, fireGraphLoadEnd } = makeServices();
            new SparqlStatusBarService(queryService, endpointTester, graphService, connectionRegistry);

            const connection = { id: 'c1', endpointUrl: 'https://dbpedia.org/sparql' } as SparqlConnection;

            fireGraphLoadStart(connection);

            expect(sparqlItem().text).toBe('$(sync~spin) Loading graphs 1 of 1: https://dbpedia.org/sparql');

            fireGraphLoadEnd(connection);

            expect(sparqlItem().text).toBe('$(arrow-swap) 0 connections; 0 graphs');
            expect(sparqlItem().hide).not.toHaveBeenCalled();
        });

        it('shows progress and the oldest still-loading connection when multiple loads overlap', () => {
            const { queryService, endpointTester, connectionRegistry, graphService, fireGraphLoadStart, fireGraphLoadEnd } = makeServices();
            new SparqlStatusBarService(queryService, endpointTester, graphService, connectionRegistry);

            const first = { id: 'c1', endpointUrl: 'https://first.example.org/sparql' } as SparqlConnection;
            const second = { id: 'c2', endpointUrl: 'https://second.example.org/sparql' } as SparqlConnection;

            fireGraphLoadStart(first);
            fireGraphLoadStart(second);

            // Both loads are in flight — the oldest (first) is shown as current.
            expect(sparqlItem().text).toBe('$(sync~spin) Loading graphs 1 of 2: https://first.example.org/sparql');

            fireGraphLoadEnd(first);

            // The first finished — the second is now the oldest still in flight.
            expect(sparqlItem().text).toBe('$(sync~spin) Loading graphs 2 of 2: https://second.example.org/sparql');

            fireGraphLoadEnd(second);

            expect(sparqlItem().text).toBe('$(arrow-swap) 0 connections; 0 graphs');
        });

        it('composes query execution and graph loading into one label at the same time', () => {
            const { queryService, endpointTester, connectionRegistry, graphService, fireQueryStart, fireGraphLoadStart } = makeServices();
            new SparqlStatusBarService(queryService, endpointTester, graphService, connectionRegistry);

            const state = {
                id: crypto.randomUUID(),
                documentIri: 'file:///test.sparql',
                status: 'running',
            } as unknown as SparqlQueryExecutionState;

            const connection = { id: 'c1', endpointUrl: 'https://dbpedia.org/sparql' } as SparqlConnection;

            fireQueryStart(state);
            fireGraphLoadStart(connection);

            // Both activities are visible on the one item simultaneously.
            expect(sparqlItem().text).toContain('test.sparql');
            expect(sparqlItem().text).toContain('Loading graphs 1 of 1: https://dbpedia.org/sparql');
        });
    });

    describe('connection and graph summary', () => {
        it('shows the connection and graph counts in the idle label', () => {
            const services = makeServices();
            services.connections.push({ id: 'workspace' }, { id: 'remote' });
            services.graphsByConnection['workspace'] = ['workspace:///a.ttl', 'workspace:///b.ttl'];
            services.graphsByConnection['remote'] = ['http://example.org/g1'];

            new SparqlStatusBarService(services.queryService, services.endpointTester, services.graphService, services.connectionRegistry);

            expect(sparqlItem().text).toBe('$(arrow-swap) 2 connections; 3 graphs');
        });

        it('uses singular forms for a single connection and graph', () => {
            const services = makeServices();
            services.connections.push({ id: 'workspace' });
            services.graphsByConnection['workspace'] = ['workspace:///a.ttl'];

            new SparqlStatusBarService(services.queryService, services.endpointTester, services.graphService, services.connectionRegistry);

            expect(sparqlItem().text).toBe('$(arrow-swap) 1 connection; 1 graph');
        });

        it('updates the label when the connections change', () => {
            const services = makeServices();

            new SparqlStatusBarService(services.queryService, services.endpointTester, services.graphService, services.connectionRegistry);

            expect(sparqlItem().text).toBe('$(arrow-swap) 0 connections; 0 graphs');

            services.connections.push({ id: 'workspace' });
            services.fireConnectionsChanged();

            expect(sparqlItem().text).toBe('$(arrow-swap) 1 connection; 0 graphs');
        });

        it('updates the label when the graphs of a connection change', () => {
            const services = makeServices();
            services.connections.push({ id: 'workspace' });

            new SparqlStatusBarService(services.queryService, services.endpointTester, services.graphService, services.connectionRegistry);

            services.graphsByConnection['workspace'] = ['workspace:///a.ttl', 'workspace:///b.ttl'];
            services.fireGraphsChanged('workspace');

            expect(sparqlItem().text).toBe('$(arrow-swap) 1 connection; 2 graphs');
        });
    });

    describe('dispose', () => {
        it('disposes the status bar item and unsubscribes all event handlers', () => {
            const { queryService, endpointTester, connectionRegistry, graphService, fireQueryStart, fireTestStart } = makeServices();
            const service = new SparqlStatusBarService(queryService, endpointTester, graphService, connectionRegistry);

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
