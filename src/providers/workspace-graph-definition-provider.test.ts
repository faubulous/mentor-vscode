import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const mockContextService = {
	contexts: {} as Record<string, any>,
};

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'DocumentContextService') return mockContextService;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { WorkspaceGraphDefinitionProvider } from './workspace-graph-definition-provider';

describe('WorkspaceGraphDefinitionProvider', () => {
	const pos = new vscode.Position(0, 5);
	let provider: WorkspaceGraphDefinitionProvider;

	beforeEach(() => {
		vi.clearAllMocks();
		mockContextService.contexts = {};
		provider = new WorkspaceGraphDefinitionProvider();
	});

	it('returns null when no context exists for the document', () => {
		const doc = { uri: vscode.Uri.parse('file:///query.sparql') } as any;
		expect(provider.provideDefinition(doc, pos)).toBeNull();
	});

	it('returns null when no IRI is at the cursor position', () => {
		const docUri = vscode.Uri.parse('file:///query.sparql');
		mockContextService.contexts[docUri.toString()] = {
			uri: docUri,
			getIriAtPosition: vi.fn(() => undefined),
			graphIri: { toString: () => 'workspace:///query.sparql' },
		};
		const doc = { uri: docUri } as any;
		expect(provider.provideDefinition(doc, pos)).toBeNull();
	});

	it('returns null when the IRI at the cursor is not a workspace URI', () => {
		const docUri = vscode.Uri.parse('file:///query.sparql');
		mockContextService.contexts[docUri.toString()] = {
			uri: docUri,
			getIriAtPosition: vi.fn(() => 'http://example.org/Graph'),
			graphIri: { toString: () => 'workspace:///query.sparql' },
		};
		const doc = { uri: docUri } as any;
		expect(provider.provideDefinition(doc, pos)).toBeNull();
	});

	it('returns null when no loaded context has a matching graphIri', () => {
		const docUri = vscode.Uri.parse('file:///query.sparql');
		const targetUri = vscode.Uri.parse('file:///data.ttl');
		mockContextService.contexts[docUri.toString()] = {
			uri: docUri,
			getIriAtPosition: vi.fn(() => 'workspace:///data.ttl'),
			graphIri: { toString: () => 'workspace:///query.sparql' },
		};
		mockContextService.contexts[targetUri.toString()] = {
			uri: targetUri,
			getIriAtPosition: vi.fn(),
			graphIri: { toString: () => 'workspace:///other.ttl' },
		};
		const doc = { uri: docUri } as any;
		expect(provider.provideDefinition(doc, pos)).toBeNull();
	});

	it('returns a Location pointing to the matching file context', () => {
		const docUri = vscode.Uri.parse('file:///query.sparql');
		const targetUri = vscode.Uri.parse('file:///data.ttl');
		mockContextService.contexts[docUri.toString()] = {
			uri: docUri,
			getIriAtPosition: vi.fn(() => 'workspace:///data.ttl'),
			graphIri: { toString: () => 'workspace:///query.sparql' },
		};
		mockContextService.contexts[targetUri.toString()] = {
			uri: targetUri,
			getIriAtPosition: vi.fn(),
			graphIri: { toString: () => 'workspace:///data.ttl' },
		};
		const doc = { uri: docUri } as any;
		const result = provider.provideDefinition(doc, pos);
		expect(result).toBeInstanceOf(vscode.Location);
		expect((result as vscode.Location).uri).toBe(targetUri);
	});

	it('returns a Location pointing to the matching notebook cell context', () => {
		const docUri = vscode.Uri.parse('file:///query.sparql');
		const cellUri = vscode.Uri.parse('vscode-notebook-cell:///notebook.mnb#my-data');
		mockContextService.contexts[docUri.toString()] = {
			uri: docUri,
			getIriAtPosition: vi.fn(() => 'workspace:///notebook.mnb#my-data'),
			graphIri: { toString: () => 'workspace:///query.sparql' },
		};
		mockContextService.contexts[cellUri.toString()] = {
			uri: cellUri,
			getIriAtPosition: vi.fn(),
			graphIri: { toString: () => 'workspace:///notebook.mnb#my-data' },
		};
		const doc = { uri: docUri } as any;
		const result = provider.provideDefinition(doc, pos);
		expect(result).toBeInstanceOf(vscode.Location);
		expect((result as vscode.Location).uri).toBe(cellUri);
	});

	it('returns a Location at position (0,0) in the target document', () => {
		const docUri = vscode.Uri.parse('file:///query.sparql');
		const targetUri = vscode.Uri.parse('file:///data.ttl');
		mockContextService.contexts[docUri.toString()] = {
			uri: docUri,
			getIriAtPosition: vi.fn(() => 'workspace:///data.ttl'),
			graphIri: { toString: () => 'workspace:///query.sparql' },
		};
		mockContextService.contexts[targetUri.toString()] = {
			uri: targetUri,
			getIriAtPosition: vi.fn(),
			graphIri: { toString: () => 'workspace:///data.ttl' },
		};
		const doc = { uri: docUri } as any;
		const result = provider.provideDefinition(doc, pos) as vscode.Location;
		expect(result.range.start.line).toBe(0);
		expect(result.range.start.character).toBe(0);
	});
});
