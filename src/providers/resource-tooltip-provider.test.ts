import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({ serialize: vi.fn() }));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

const mockContextService = {
	contexts: {} as Record<string, any>,
	activeContext: undefined as any,
};

const mockStore = {
	matchAll: vi.fn(() => [] as any[]),
};

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'DocumentContextService') return mockContextService;
			if (token === 'ExtensionContext') return { subscriptions: [] };
			if (token === 'Store') return mockStore;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { ResourceTooltipProvider } from '@src/providers/resource-tooltip-provider';

describe('ResourceTooltipProvider', () => {
	let provider: ResourceTooltipProvider;
	const mockPosition = new vscode.Position(5, 10);

	beforeEach(() => {
		vi.clearAllMocks();
		mockContextService.contexts = {};
		mockContextService.activeContext = undefined;
		mockStore.matchAll = vi.fn(() => []);
		provider = new ResourceTooltipProvider();
	});

	function makeDoc(uri: string, text = '', context?: any) {
		if (context) {
			mockContextService.contexts[uri] = context;
		}
		const lines = text.split('\n');
		return {
			uri: vscode.Uri.parse(uri),
			getText: () => text,
			offsetAt: (_pos: vscode.Position) => 0,
			lineAt: (line: number) => ({ text: lines[line] ?? '' }),
		} as any;
	}

	it('returns null when no context for document', () => {
		const doc = makeDoc('file:///test.ttl');
		expect(provider.provideHover(doc, mockPosition)).toBeNull();
	});

	it('returns hover with IRI tooltip when IRI at position', () => {
		const doc = makeDoc('file:///test.ttl', '', {
			getIriAtPosition: vi.fn(() => 'http://example.org/Class'),
			getLiteralAtPosition: vi.fn(() => null),
			getResourceTooltip: vi.fn(() => 'This is a class.'),
		});
		const result = provider.provideHover(doc, mockPosition) as any;
		expect(result).toBeDefined();
		expect(result.contents).toBe('This is a class.');
	});

	it('returns hover with literal value when literal at position', () => {
		const doc = makeDoc('file:///test.ttl', '', {
			getIriAtPosition: vi.fn(() => null),
			getLiteralAtPosition: vi.fn(() => 'hello world'),
		});
		const result = provider.provideHover(doc, mockPosition) as any;
		expect(result).toBeDefined();
		expect(result.contents).toBe('hello world');
	});

	it('returns null when nothing at position', () => {
		const doc = makeDoc('file:///test.ttl', '', {
			getIriAtPosition: vi.fn(() => null),
			getLiteralAtPosition: vi.fn(() => null),
		});
		expect(provider.provideHover(doc, mockPosition)).toBeNull();
	});

	it('returns null for triplate interpolation positions', () => {
		const text = '---\nparams { x: iri }\n---\nSELECT * WHERE { ?s a ${x} . }';
		const lines = text.split('\n');
		const uri = 'file:///test.sparql';

		// With the overlay, ${x} is a TRIPLATE_INTERPOLATION token, so the document
		// context resolves no IRI/literal there (the hover is owned by TriplateHoverProvider).
		mockContextService.contexts[uri] = {
			getIriAtPosition: vi.fn(() => null),
			getLiteralAtPosition: vi.fn(() => null),
		};

		const doc = {
			uri: vscode.Uri.parse(uri),
			getText: () => text,
			offsetAt: (_pos: vscode.Position) => text.indexOf('${x}') + 1, // inside the body interpolation
			lineAt: (line: number) => ({ text: lines[line] ?? '' }),
		} as any;

		expect(provider.provideHover(doc, mockPosition)).toBeNull();
	});

	it('returns a tooltip for a known URI inside triplate frontmatter', () => {
		const text = '---\nparams { type: iri }\nexample x {\n  type: <http://example.org/Person>\n}\n---\nSELECT * WHERE {}';
		const lines = text.split('\n');
		const uriOffset = text.indexOf('http://example.org/Person');

		mockStore.matchAll = vi.fn(() => [{}]);
		mockContextService.activeContext = { isLoaded: true, getResourceTooltip: vi.fn(() => 'Person class.') };

		const doc = {
			uri: vscode.Uri.parse('file:///test.sparql'),
			getText: () => text,
			offsetAt: (_pos: vscode.Position) => uriOffset, // inside the frontmatter
			lineAt: (line: number) => ({ text: lines[line] ?? '' }),
		} as any;

		// Position on the example value line, inside the URI.
		const result = provider.provideHover(doc, new vscode.Position(3, 12)) as any;

		expect(result).toBeDefined();
		expect(result.contents).toBe('Person class.');
	});

	it('returns null for an unknown URI inside triplate frontmatter', () => {
		const text = '---\nparams { type: iri }\nexample x {\n  type: <http://example.org/Unknown>\n}\n---\nSELECT * WHERE {}';
		const lines = text.split('\n');
		const uriOffset = text.indexOf('http://example.org/Unknown');

		mockStore.matchAll = vi.fn(() => []); // not known in the store

		const doc = {
			uri: vscode.Uri.parse('file:///test.sparql'),
			getText: () => text,
			offsetAt: (_pos: vscode.Position) => uriOffset,
			lineAt: (line: number) => ({ text: lines[line] ?? '' }),
		} as any;

		expect(provider.provideHover(doc, new vscode.Position(3, 12))).toBeNull();
	});
});
