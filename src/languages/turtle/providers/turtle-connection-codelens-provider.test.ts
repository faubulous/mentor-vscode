import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockConnectionService } = vi.hoisted(() => ({
	mockConnectionService: {
		getConnectionForDocument: vi.fn(),
		onDidChangeConnectionForDocument: vi.fn(() => ({ dispose: vi.fn() })),
		onDidChangeConnections: vi.fn(() => ({ dispose: vi.fn() })),
	},
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SparqlConnectionRegistry' || token === 'DocumentConnectionService') return mockConnectionService;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => { },
	singleton: () => (t: any) => t,
}));

vi.mock('@src/languages/sparql/services/sparql-connection-registry', () => ({
	WORKSPACE_CONNECTION: { id: 'workspace', label: 'Workspace', endpointUrl: 'workspace:' },
}));

import { TurtleConnectionCodeLensProvider } from '@src/languages/turtle/providers/turtle-connection-codelens-provider';

function makeDoc(uri: string) {
	return { uri: { scheme: uri.split(':')[0], toString: () => uri } } as any;
}

beforeEach(() => {
	vi.clearAllMocks();
	mockConnectionService.onDidChangeConnectionForDocument.mockReturnValue({ dispose: vi.fn() });
	mockConnectionService.onDidChangeConnections.mockReturnValue({ dispose: vi.fn() });
});

describe('TurtleConnectionCodeLensProvider', () => {
	it('shows the workspace connection label at the top of the document', () => {
		mockConnectionService.getConnectionForDocument.mockReturnValue({ id: 'workspace', endpointUrl: 'workspace:' });

		const provider = new TurtleConnectionCodeLensProvider(mockConnectionService as any, mockConnectionService as any);
		const doc = makeDoc('file:///doc.ttl');
		const lenses = provider.provideCodeLenses(doc) as any[];

		expect(lenses).toHaveLength(1);
		expect(lenses[0].range.start.line).toBe(0);
		expect(lenses[0].range.start.character).toBe(0);
		expect(lenses[0].command.title).toContain('Connection: workspace');
		expect(lenses[0].command.command).toBe('mentor.command.selectSparqlConnection');
		expect(lenses[0].command.arguments).toEqual([doc]);
	});

	it('shows the endpoint URL for a non-workspace connection', () => {
		mockConnectionService.getConnectionForDocument.mockReturnValue({ id: 'abc', endpointUrl: 'https://dbpedia.org/sparql' });

		const provider = new TurtleConnectionCodeLensProvider(mockConnectionService as any, mockConnectionService as any);
		const lenses = provider.provideCodeLenses(makeDoc('file:///doc.ttl')) as any[];

		expect(lenses[0].command.title).toContain('Connection: https://dbpedia.org/sparql');
	});

	it('returns no lenses for notebook cell documents', () => {
		mockConnectionService.getConnectionForDocument.mockReturnValue({ id: 'workspace', endpointUrl: 'workspace:' });

		const provider = new TurtleConnectionCodeLensProvider(mockConnectionService as any, mockConnectionService as any);
		const lenses = provider.provideCodeLenses(makeDoc('vscode-notebook-cell:///cell.ttl')) as any[];

		expect(lenses).toEqual([]);
	});

	it('returns no lenses when there is no connection', () => {
		mockConnectionService.getConnectionForDocument.mockReturnValue(undefined);

		const provider = new TurtleConnectionCodeLensProvider(mockConnectionService as any, mockConnectionService as any);
		const lenses = provider.provideCodeLenses(makeDoc('file:///doc.ttl')) as any[];

		expect(lenses).toEqual([]);
	});

	it('refreshes the lenses when the document connection changes', () => {
		mockConnectionService.getConnectionForDocument.mockReturnValue({ id: 'workspace', endpointUrl: 'workspace:' });

		let connectionHandler: (() => void) | undefined;
		mockConnectionService.onDidChangeConnectionForDocument.mockImplementation((h: any) => {
			connectionHandler = h;
			return { dispose: vi.fn() };
		});

		const provider = new TurtleConnectionCodeLensProvider(mockConnectionService as any, mockConnectionService as any);

		// Subscriptions are wired lazily on first use.
		provider.provideCodeLenses(makeDoc('file:///doc.ttl'));

		const fired: number[] = [];
		provider.onDidChangeCodeLenses(() => fired.push(1));

		expect(connectionHandler).toBeDefined();
		connectionHandler!();

		expect(fired).toHaveLength(1);
	});
});
