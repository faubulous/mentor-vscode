import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

/**
 * Services resolved by the connections controller through tsyringe, set per test.
 */
const services: Record<string, any> = {};

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => services[token] ?? {}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { Store } from '@faubulous/mentor-rdf';
import { GraphManagementService } from '@src/languages/sparql/services/graph-management-service';
import { SparqlStatusBarService } from '@src/languages/sparql/services/sparql-status-bar-service';
import { WORKSPACE_CONNECTION } from '@src/languages/sparql/services/workspace-store';
import { ConnectionsSectionController } from '@src/views/webviews/views/settings/sections/query/connections-controller';
import { createStatusBarRecorder } from '@src/utilities/mocks/factories';

/**
 * Cross-surface consistency: the SPARQL status bar and the connections list
 * (settings webview) must report the SAME workspace graph count, fed by the
 * SAME GraphManagementService over the SAME store. Historically the two
 * surfaces were only tested against separate stubs, which let the status bar
 * show a stale "0 graphs" while the list showed the real count.
 */

function makeContext() {
	const state = new Map<string, any>();

	return {
		workspaceState: {
			get: (key: string, defaultValue?: any) => state.has(key) ? state.get(key) : defaultValue,
			update: async (key: string, value: any) => { state.set(key, value); },
			keys: () => [...state.keys()],
		},
		subscriptions: [],
	};
}

function setup() {
	const store = new Store();

	const registry = {
		getConnections: () => [WORKSPACE_CONNECTION],
		getConnection: (id: string) => id === WORKSPACE_CONNECTION.id ? WORKSPACE_CONNECTION : undefined,
		getInferenceEnabled: () => false,
		onDidChangeConnections: new vscode.EventEmitter<void>().event,
	};

	const storeConfig = {
		isWorkspaceConnectionId: (id: string) => id === WORKSPACE_CONNECTION.id,
		getQueryTemplate: () => 'SELECT ?g WHERE { GRAPH ?g {} }',
	};

	const graphService = new GraphManagementService(
		makeContext() as any,
		registry as any,
		{} as any,
		storeConfig as any,
		store
	);

	const queryService = {
		onDidQueryExecutionStart: new vscode.EventEmitter<any>().event,
		onDidQueryExecutionEnd: new vscode.EventEmitter<any>().event,
	};

	const endpointTester = {
		onDidConnectionTestStart: new vscode.EventEmitter<any>().event,
		onDidConnectionTestEnd: new vscode.EventEmitter<any>().event,
	};

	services['GraphManagementService'] = graphService;
	services['SparqlConnectionRegistry'] = registry;
	services['SparqlEndpointTester'] = endpointTester;
	services['CredentialStorageService'] = {};

	const recorder = createStatusBarRecorder();

	new SparqlStatusBarService(queryService as any, endpointTester as any, graphService, registry as any);

	const posts: any[] = [];
	const controller = new ConnectionsSectionController();
	controller.initialize(message => posts.push(message));

	const statusBarItem = () => recorder.items[0]!;
	const statusBarGraphCount = () => {
		const match = /(\d+) graphs/.exec(statusBarItem().text);
		return match ? parseInt(match[1], 10) : NaN;
	};

	return { store, graphService, controller, posts, statusBarItem, statusBarGraphCount };
}

describe('workspace graph count consistency', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();

		for (const key of Object.keys(services)) {
			delete services[key];
		}
	});

	it('status bar and connections list report the same count after the store gains graphs', async () => {
		const { store, graphService, controller, posts, statusBarGraphCount } = setup();

		// Before any data both surfaces agree on zero.
		expect(statusBarGraphCount()).toBe(0);

		store.loadTurtle('<urn:s> <urn:p> <urn:o> .', 'urn:test:g1', false);
		store.loadTurtle('<urn:s> <urn:p> <urn:o> .', 'urn:test:g2', false);

		// The composition root forwards indexing/document/shape-graph events here.
		graphService.notifyWorkspaceGraphsChanged();
		await vi.advanceTimersByTimeAsync(300);

		// The status bar re-rendered from its onDidChangeGraphs subscription.
		expect(statusBarGraphCount()).toBe(2);

		// The connections list received the same count via the live push...
		const pushes = posts.filter(p => p.id === 'GraphStatusChanged' && p.connectionId === WORKSPACE_CONNECTION.id);
		const pushed = pushes[pushes.length - 1];

		expect(pushed?.status.count).toBe(2);

		// ...and reports it identically on a fresh pull.
		await controller.handleMessage({ id: 'GetGraphStatuses' } as any);

		const results = posts.filter(p => p.id === 'GetGraphStatusesResult');
		const statuses = results[results.length - 1]!.statuses;

		expect(statuses[WORKSPACE_CONNECTION.id].count).toBe(statusBarGraphCount());
		expect(graphService.getWorkspaceGraphs(false)).toHaveLength(statusBarGraphCount());
	});

	it('coalesces a burst of notifications into a single change event', async () => {
		const { store, graphService } = setup();

		const fired: string[] = [];
		graphService.onDidChangeGraphs(id => fired.push(id));

		store.loadTurtle('<urn:s> <urn:p> <urn:o> .', 'urn:test:g1', false);

		for (let i = 0; i < 10; i++) {
			graphService.notifyWorkspaceGraphsChanged();
		}

		await vi.advanceTimersByTimeAsync(300);

		expect(fired).toEqual([WORKSPACE_CONNECTION.id]);
	});

	it('does not fire when the graph set is unchanged', async () => {
		const { store, graphService } = setup();

		store.loadTurtle('<urn:s> <urn:p> <urn:o> .', 'urn:test:g1', false);

		graphService.notifyWorkspaceGraphsChanged();
		await vi.advanceTimersByTimeAsync(300);

		const fired: string[] = [];
		graphService.onDidChangeGraphs(id => fired.push(id));

		// No store change between notifications: nothing to repaint anywhere.
		graphService.notifyWorkspaceGraphsChanged();
		await vi.advanceTimersByTimeAsync(300);

		expect(fired).toEqual([]);
	});
});
