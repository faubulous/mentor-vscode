import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import * as vscode from 'vscode';
import { __events } from '@src/utilities/mocks/vscode';
import { createMockNotebook } from '@src/utilities/mocks/factories';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { WORKSPACE_CONNECTION } from '@src/languages/sparql/services/workspace-store';
import { DocumentConnectionService } from '@src/languages/sparql/services/document-connection-service';
import { SparqlGraphDiagnosticProvider } from '@src/languages/sparql/providers/sparql-graph-diagnostic-provider';

const DBPEDIA_CONNECTION = {
	id: 'dbpedia',
	endpointUrl: 'https://dbpedia.org/sparql',
	configScope: ConfigurationScope.User,
	autoLoadGraphs: true,
} as any;

const DBPEDIA_GRAPH = 'http://dbpedia.org/graph';

/**
 * Builds the provider with services whose behavior can be tuned per test. The
 * document's connection and the per-connection graph lists are controlled via the
 * returned setters.
 */
function setup() {
	let connection: any = DBPEDIA_CONNECTION;

	// Graph lists per connection id. dbpedia knows DBPEDIA_GRAPH; the workspace store is empty.
	const graphsByConnection: Record<string, string[]> = {
		'dbpedia': [DBPEDIA_GRAPH],
		[WORKSPACE_CONNECTION.id]: [],
	};

	const graphService = {
		onDidChangeGraphs: () => ({ dispose: () => {} }),
		hasGraphsForConnection: (id: string) => graphsByConnection[id] !== undefined,
		getGraphsForConnection: (id: string) => graphsByConnection[id] ?? [],
		ensureGraphsLoadedForConnection: vi.fn(async () => {}),
	} as any;

	const documentConnectionService = {
		onDidChangeConnectionForDocument: () => ({ dispose: () => {} }),
		getConnectionForDocument: () => connection,
		getInferenceEnabledForDocument: () => false,
	} as any;

	const provider = new SparqlGraphDiagnosticProvider(documentConnectionService, graphService);

	return {
		provider,
		graphService,
		setConnection: (c: any) => { connection = c; },
	};
}

function makeDoc(text: string) {
	return {
		uri: vscode.Uri.parse('untitled:query.sparql'),
		languageId: 'sparql',
		getText: () => text,
		positionAt: (offset: number) => new vscode.Position(0, offset),
	} as any;
}

function diagnosticsFor(provider: SparqlGraphDiagnosticProvider, doc: any) {
	return (provider as any)._collection.get(doc.uri) as any[] | undefined;
}

describe('SparqlGraphDiagnosticProvider', () => {
	beforeEach(() => {
		(vscode.workspace as any).textDocuments = [];
	});

	it('does not flag a graph that exists in the connected (dbpedia) store', () => {
		const { provider } = setup();
		const doc = makeDoc(`SELECT * FROM <${DBPEDIA_GRAPH}> WHERE { ?s ?p ?o }`);

		(provider as any)._validateDocument(doc);

		expect(diagnosticsFor(provider, doc)).toEqual([]);
	});

	it('flags a graph missing from the workspace store after switching to the workspace connection', () => {
		const { provider, setConnection } = setup();

		// Switch the document from dbpedia to the in-memory workspace store, which does
		// not contain the dbpedia graph.
		setConnection(WORKSPACE_CONNECTION);

		const doc = makeDoc(`SELECT * FROM <${DBPEDIA_GRAPH}> WHERE { ?s ?p ?o }`);

		(provider as any)._validateDocument(doc);

		const diagnostics = diagnosticsFor(provider, doc);

		expect(diagnostics).toHaveLength(1);
		expect(diagnostics![0].message).toContain(DBPEDIA_GRAPH);
	});

	it('requests an on-demand graph load for the document connection', () => {
		const { provider, graphService } = setup();

		(provider as any)._validateDocument(makeDoc('SELECT * WHERE { ?s ?p ?o }'));

		// The per-edit path never passes retry options — a failing endpoint must
		// not be re-queried on every keystroke.
		expect(graphService.ensureGraphsLoadedForConnection).toHaveBeenCalledWith(DBPEDIA_CONNECTION, undefined);
	});
});

/**
 * End-to-end notebook flow: a REAL DocumentConnectionService over mock
 * notebooks with a metadata round-trip, feeding the REAL diagnostic provider.
 * Regression coverage for the stale-lint bug where changing a notebook's
 * connection left "Graph <…> not found" warnings from the old connection.
 */
describe('SparqlGraphDiagnosticProvider notebook connection changes', () => {
	const KNOWN_GRAPH = 'urn:test:g1';

	const CONNECTION_A = {
		id: 'a',
		endpointUrl: 'https://a.example.org/sparql',
		configScope: ConfigurationScope.User,
		autoLoadGraphs: true,
	} as any;

	const CONNECTION_B = {
		id: 'b',
		endpointUrl: 'https://b.example.org/sparql',
		configScope: ConfigurationScope.User,
		autoLoadGraphs: true,
	} as any;

	function makeExtensionContext() {
		const state = new Map<string, any>();

		return {
			workspaceState: {
				get: (key: string, defaultValue?: any) => state.has(key) ? state.get(key) : defaultValue,
				update: async (key: string, value: any) => { state.set(key, value); },
				keys: () => [...state.keys()],
			},
			subscriptions: [] as any[],
		};
	}

	function setupNotebook() {
		// Connection 'a' knows the graph, connection 'b' does not.
		const graphsByConnection: Record<string, string[]> = {
			a: [KNOWN_GRAPH],
			b: [],
			[WORKSPACE_CONNECTION.id]: [],
		};

		const graphService = {
			onDidChangeGraphs: () => ({ dispose: () => {} }),
			hasGraphsForConnection: (id: string) => graphsByConnection[id] !== undefined,
			getGraphsForConnection: (id: string) => graphsByConnection[id] ?? [],
			ensureGraphsLoadedForConnection: vi.fn(async () => {}),
		} as any;

		const registry = {
			getConnection: (id: string) => [CONNECTION_A, CONNECTION_B].find(c => c.id === id),
			getInferenceEnabled: () => false,
		} as any;

		const notebook = createMockNotebook([
			{ languageId: 'sparql', content: `SELECT * FROM <${KNOWN_GRAPH}> WHERE { ?s ?p ?o }`, metadata: { connectionId: 'a' } },
			{ languageId: 'sparql', content: `SELECT * FROM <${KNOWN_GRAPH}> WHERE { ?s ?p ?o }`, metadata: { connectionId: 'a' } },
		]);

		const cells = notebook.getCells();

		// Cell documents appear in workspace.textDocuments in the real API.
		(vscode.workspace as any).notebookDocuments = [notebook];
		(vscode.workspace as any).textDocuments = cells.map(cell => cell.document);

		const connectionService = new DocumentConnectionService(makeExtensionContext() as any, registry);
		const provider = new SparqlGraphDiagnosticProvider(connectionService, graphService);

		return { notebook, cells, connectionService, provider, graphService };
	}

	function warningsFor(provider: SparqlGraphDiagnosticProvider, cell: vscode.NotebookCell) {
		return (provider as any)._collection.get(cell.document.uri) as any[] | undefined;
	}

	beforeEach(() => {
		// Services under test subscribe to the shared mock events; drop listeners
		// left behind by previous tests before firing events.
		__events.reset();
		(vscode.workspace as any).textDocuments = [];
		(vscode.workspace as any).notebookDocuments = [];
	});

	afterEach(() => {
		(vscode.workspace as any).textDocuments = [];
		(vscode.workspace as any).notebookDocuments = [];
	});

	it('re-lints every cell when the notebook connection changes, both ways', async () => {
		const { notebook, cells, connectionService, provider } = setupNotebook();

		// On construction the cells validate against connection 'a': no warnings.
		for (const cell of cells) {
			expect(warningsFor(provider, cell)).toEqual([]);
		}

		// Switch the whole notebook to connection 'b', which lacks the graph.
		await connectionService.setConnectionForNotebook(notebook, 'b');

		for (const cell of cells) {
			const warnings = warningsFor(provider, cell);

			expect(warnings).toHaveLength(1);
			expect(warnings![0].message).toContain(KNOWN_GRAPH);
		}

		// Switching back clears the warnings again.
		await connectionService.setConnectionForNotebook(notebook, 'a');

		for (const cell of cells) {
			expect(warningsFor(provider, cell)).toEqual([]);
		}
	});

	it('retries a failed graph load on an explicit connection change', async () => {
		const { notebook, connectionService, graphService } = setupNotebook();

		await connectionService.setConnectionForNotebook(notebook, 'b');

		// The connection-change path opts into retrying error-cached loads.
		expect(graphService.ensureGraphsLoadedForConnection).toHaveBeenCalledWith(
			CONNECTION_B,
			{ retryOnError: true }
		);
	});

	it('fans a notebook-level notification out to the notebook cells', async () => {
		const { notebook, cells, connectionService, provider } = setupNotebook();

		// Apply the metadata directly (no per-cell events) to simulate a legacy
		// caller, then notify with the notebook URI like the old toolbar command.
		for (const cell of cells) {
			(cell as any).metadata = { ...cell.metadata, connectionId: 'b' };
		}

		connectionService.notifyDocumentConnectionChanged(notebook.uri);

		for (const cell of cells) {
			expect(warningsFor(provider, cell)).toHaveLength(1);
		}
	});

	it('re-lints cells from the notebook metadata event alone (ordering safety net)', async () => {
		vi.useFakeTimers();

		try {
			const { notebook, cells, provider } = setupNotebook();

			// Change the cell metadata through a raw workspace edit: the mock
			// applyEdit applies it and fires onDidChangeNotebookDocument, but no
			// connection-change event is emitted by anyone.
			const edit = new vscode.WorkspaceEdit();
			edit.set(notebook.uri, cells.map(cell =>
				vscode.NotebookEdit.updateCellMetadata(cell.index, { ...cell.metadata, connectionId: 'b' })) as any);

			await vscode.workspace.applyEdit(edit);

			// The safety net revalidates through the 300 ms keyed debouncer.
			await vi.advanceTimersByTimeAsync(300);

			for (const cell of cells) {
				expect(warningsFor(provider, cell)).toHaveLength(1);
			}
		} finally {
			vi.useRealTimers();
		}
	});
});
