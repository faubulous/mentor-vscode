import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { ConnectionsSectionController } from '@src/views/webviews/views/settings/sections/query/connections-controller';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({ container: { resolve: vi.fn() } }));

interface SetupOptions {
	connections: any[];

	/**
	 * What `getStoreConfigScope` reports for any store type in the test.
	 */
	storeScope?: 'preset' | 'user' | 'workspace' | undefined;

	/**
	 * Whether `getStoreConfig` resolves store types; `false` simulates a store
	 * that is not defined on this machine.
	 */
	storeResolves?: boolean;
}

function setup({ connections, storeScope, storeResolves = true }: SetupOptions) {
	const connectionChangeListeners: Array<() => void> = [];

	const connectionRegistry = {
		getConnections: vi.fn(() => connections),
		getInferenceEnabled: vi.fn(() => false),
		onDidChangeConnections: (listener: () => void) => {
			connectionChangeListeners.push(listener);
			return { dispose: () => { } };
		},
		saveConnectionWithCredential: vi.fn(async () => { }),
	};

	const graphService = {
		onDidGraphLoadStart: () => ({ dispose: () => { } }),
		onDidGraphLoadEnd: () => ({ dispose: () => { } }),
		onDidChangeGraphs: () => ({ dispose: () => { } }),
		getGraphsForConnection: vi.fn(() => []),
		getGraphLoadError: vi.fn(() => undefined),
		getWorkspaceGraphs: vi.fn(() => []),
		hasGraphsForConnection: vi.fn(() => false),
	};

	const documentContextService = {
		onDidChangeDocumentContext: () => ({ dispose: () => { } }),
	};

	const storeConfigService = {
		isWorkspaceConnectionId: (id: string) => id === 'workspace',
		getStoreConfig: vi.fn(() => storeResolves ? {} : undefined),
		getStoreConfigScope: vi.fn(() => storeScope),
		getStoreConfigs: vi.fn(() => []),
	};

	const endpointTester = { testConnection: vi.fn(async () => null) };

	const credentialService = {
		getCredential: vi.fn(async () => undefined),
		deleteCredential: vi.fn(async () => { }),
		saveCredential: vi.fn(async () => { }),
	};

	(container.resolve as any).mockImplementation((token: any) => {
		switch (token) {
			case ServiceToken.SparqlConnectionRegistry: return connectionRegistry;
			case ServiceToken.GraphManagementService: return graphService;
			case ServiceToken.DocumentContextService: return documentContextService;
			case ServiceToken.StoreConfigService: return storeConfigService;
			case ServiceToken.SparqlEndpointTester: return endpointTester;
			case ServiceToken.CredentialStorageService: return credentialService;
			default: throw new Error(`Unexpected token: ${String(token)}`);
		}
	});

	// Capture the configuration-change subscription so tests can simulate a
	// stores settings write (e.g. a store moving between scopes).
	let configListener: ((e: any) => void) | undefined;

	vi.spyOn(vscode.workspace, 'onDidChangeConfiguration').mockImplementation(((listener: any) => {
		configListener = listener;
		return { dispose: () => { } };
	}) as any);

	const controller = new ConnectionsSectionController();
	const post = vi.fn();
	controller.initialize(post as any);

	return {
		controller,
		post,
		connectionRegistry,
		storeConfigService,
		fireConfigChange: (section: string) => configListener?.({ affectsConfiguration: (s: string) => s === section }),
		fireConnectionsChanged: () => connectionChangeListeners.forEach(l => l()),
	};
}

describe('ConnectionsSectionController – store scope compatibility', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('flags a scope mismatch when the stores settings move the store to the other scope', () => {
		const connection = { id: 'c1', endpointUrl: 'http://e1', storeType: 'mystore', configScope: ConfigurationScope.Workspace };
		const { post, fireConfigChange } = setup({ connections: [connection], storeScope: 'user' });

		fireConfigChange('mentor.sparql.stores');

		expect(post).toHaveBeenCalledWith(expect.objectContaining({ id: 'ConnectionsChanged' }));

		const message = post.mock.calls.at(-1)![0];
		expect(message.connections[0].incompatibleStoreScope).toBe('user');
	});

	it('clears a stale mismatch flag when the store is back in the connection scope', () => {
		// The stale flag simulates a view that was round-tripped through the webview
		// (e.g. saved from the editor) before the store was moved back.
		const connection = {
			id: 'c1', endpointUrl: 'http://e1', storeType: 'mystore',
			configScope: ConfigurationScope.Workspace, incompatibleStoreScope: 'user',
		};
		const { post, fireConfigChange } = setup({ connections: [connection], storeScope: 'workspace' });

		fireConfigChange('mentor.sparql.stores');

		const message = post.mock.calls.at(-1)![0];
		expect(message.connections[0].incompatibleStoreScope).toBeUndefined();
	});

	it('reevaluates compatibility when a connection changes (e.g. its scope was edited)', () => {
		const connection = { id: 'c1', endpointUrl: 'http://e1', storeType: 'mystore', configScope: ConfigurationScope.User };
		const { post, fireConnectionsChanged } = setup({ connections: [connection], storeScope: 'workspace' });

		fireConnectionsChanged();

		const message = post.mock.calls.at(-1)![0];
		expect(message.id).toBe('ConnectionsChanged');
		expect(message.connections[0].incompatibleStoreScope).toBe('workspace');
	});

	it('does not re-project connections on unrelated configuration changes', () => {
		const connection = { id: 'c1', endpointUrl: 'http://e1', storeType: 'mystore', configScope: ConfigurationScope.Workspace };
		const { post, fireConfigChange } = setup({ connections: [connection], storeScope: 'user' });

		fireConfigChange('mentor.predicates.label');

		expect(post).not.toHaveBeenCalled();
	});

	it('does not flag preset stores or the workspace connection', () => {
		const connections = [
			{ id: 'workspace', endpointUrl: 'mentor:workspace', storeType: 'workspace', configScope: ConfigurationScope.Workspace },
			{ id: 'c1', endpointUrl: 'http://e1', storeType: 'sparql', configScope: ConfigurationScope.User },
		];
		const { post, fireConfigChange } = setup({ connections, storeScope: 'preset' });

		fireConfigChange('mentor.sparql.stores');

		const message = post.mock.calls.at(-1)![0];
		expect(message.connections.every((c: any) => c.incompatibleStoreScope === undefined)).toBe(true);
	});

	it('strips view-only fields before a saved connection enters the registry', async () => {
		const { controller, connectionRegistry } = setup({ connections: [], storeScope: 'workspace' });

		await controller.handleMessage({
			section: 'query.connections',
			id: 'SaveSparqlConnection',
			connection: {
				id: 'c1', endpointUrl: 'http://e1', storeType: 'mystore',
				configScope: ConfigurationScope.Workspace,
				inferenceEnabled: true, unresolvedStoreType: 'mystore', incompatibleStoreScope: 'user',
			},
			credential: null,
		} as any);

		expect(connectionRegistry.saveConnectionWithCredential).toHaveBeenCalledOnce();

		const saved = (connectionRegistry.saveConnectionWithCredential.mock.calls[0] as any[])[0];
		expect(saved).not.toHaveProperty('inferenceEnabled');
		expect(saved).not.toHaveProperty('unresolvedStoreType');
		expect(saved).not.toHaveProperty('incompatibleStoreScope');
		expect(saved).toMatchObject({ id: 'c1', endpointUrl: 'http://e1', storeType: 'mystore' });
	});
});
