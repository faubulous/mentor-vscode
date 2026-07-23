import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import * as vscode from 'vscode';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { WORKSPACE_CONNECTION } from '@src/languages/sparql/services/workspace-store';
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

		expect(graphService.ensureGraphsLoadedForConnection).toHaveBeenCalledWith(DBPEDIA_CONNECTION);
	});
});
