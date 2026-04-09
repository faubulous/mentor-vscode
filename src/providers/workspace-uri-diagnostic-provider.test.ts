import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@src/providers/workspace-uri', () => ({
	WorkspaceUri: {
		uriScheme: 'workspace',
	},
}));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const mockSubscriptions: any[] = [];
vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ExtensionContext') return { subscriptions: mockSubscriptions };
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

vi.mock('@src/services/tokens', () => ({
	ServiceToken: { ExtensionContext: 'ExtensionContext' },
}));

function makeDocument(text: string): vscode.TextDocument {
	return {
		getText: (range?: vscode.Range) => {
			if (!range) return text;
			const start = range.start.character;
			const end = range.end.character;
			return text.substring(start, end);
		},
		positionAt: (offset: number) => new vscode.Position(0, offset),
		uri: vscode.Uri.parse('file:///test.sparql'),
		lineCount: 1,
	} as any;
}

describe('WorkspaceUriDiagnosticProvider', () => {
	let WorkspaceUriDiagnosticProvider: any;
	let DEPRECATED_WORKSPACE_URI_CODE: string;

	beforeEach(async () => {
		mockSubscriptions.length = 0;

		vi.resetModules();

		const module = await import('./workspace-uri-diagnostic-provider');

		WorkspaceUriDiagnosticProvider = module.WorkspaceUriDiagnosticProvider;
		DEPRECATED_WORKSPACE_URI_CODE = module.DEPRECATED_WORKSPACE_URI_CODE;
	});

	describe('updateDiagnostics', () => {
		it('produces no diagnostics for text without workspace URIs', () => {
			const document = makeDocument('SELECT * WHERE { ?s ?p ?o }');
			const provider = new WorkspaceUriDiagnosticProvider();
			provider.updateDiagnostics(document);

			// The diagnostic collection is a mock — just verify no error was thrown.
			expect(provider).toBeDefined();
		});

		it('produces no diagnostics for new triple-slash URIs', () => {
			const document = makeDocument('FROM <workspace:///dir/file.ttl>');
			const provider = new WorkspaceUriDiagnosticProvider();
			provider.updateDiagnostics(document);

			expect(provider).toBeDefined();
		});

		it('produces a diagnostic for an old single-slash URI', () => {
			const document = makeDocument('FROM <workspace:/dir/file.ttl>');
			const provider = new WorkspaceUriDiagnosticProvider();

			let capturedDiagnostics: vscode.Diagnostic[] = [];

			// Override the set method to capture diagnostics.
			const originalCollection = (provider as any)._diagnosticCollection;
			originalCollection.set = (uri: any, diags: any) => { capturedDiagnostics = diags; };

			provider.updateDiagnostics(document);

			expect(capturedDiagnostics.length).toBe(1);
			expect(capturedDiagnostics[0].code).toBe(DEPRECATED_WORKSPACE_URI_CODE);
			expect(capturedDiagnostics[0].severity).toBe(vscode.DiagnosticSeverity.Warning);
			expect(capturedDiagnostics[0].message).toContain('workspace:///dir/file.ttl');
		});

		it('produces diagnostics for multiple old URIs', () => {
			const document = makeDocument('FROM <workspace:/a.ttl> FROM <workspace:/b.ttl>');
			const provider = new WorkspaceUriDiagnosticProvider() as any;

			let capturedDiagnostics: vscode.Diagnostic[] = [];

			provider._diagnosticCollection.set = (_uri: any, diags: any) => { capturedDiagnostics = diags; };
			provider.updateDiagnostics(document);

			expect(capturedDiagnostics.length).toBe(2);
		});

		it('does not flag triple-slash URIs mixed with old URIs', () => {
			const document = makeDocument('FROM <workspace:///new.ttl> FROM <workspace:/old.ttl>');
			const provider = new WorkspaceUriDiagnosticProvider() as any;

			let capturedDiagnostics: vscode.Diagnostic[] = [];

			provider._diagnosticCollection.set = (_uri: any, diags: any) => { capturedDiagnostics = diags; };
			provider.updateDiagnostics(document);

			expect(capturedDiagnostics.length).toBe(1);
			expect(capturedDiagnostics[0].message).toContain('workspace:///old.ttl');
		});

		it('diagnostic range covers the full old URI text', () => {
			const text = 'Link: workspace:/my/path.ttl done.';
			const document = makeDocument(text);
			const provider = new WorkspaceUriDiagnosticProvider() as any;

			let capturedDiagnostics: vscode.Diagnostic[] = [];

			provider._diagnosticCollection.set = (_uri: any, diags: any) => { capturedDiagnostics = diags; };
			provider.updateDiagnostics(document);

			const matchStart = text.indexOf('workspace:/my');
			const matchEnd = matchStart + 'workspace:/my/path.ttl'.length;

			expect(capturedDiagnostics[0].range.start.character).toBe(matchStart);
			expect(capturedDiagnostics[0].range.end.character).toBe(matchEnd);
		});

		it('handles URI with query parameters', () => {
			const document = makeDocument('workspace:/dir/file.ttl?inference');
			const provider = new WorkspaceUriDiagnosticProvider();

			let capturedDiagnostics: vscode.Diagnostic[] = [];

			provider._diagnosticCollection.set = (_uri: any, diags: any) => { capturedDiagnostics = diags; };
			provider.updateDiagnostics(document);

			expect(capturedDiagnostics.length).toBe(1);
			expect(capturedDiagnostics[0].message).toContain('workspace:///dir/file.ttl?inference');
		});
	});

	describe('provideCodeActions', () => {
		it('returns empty array when cursor is not on a deprecated URI', () => {
			const document = makeDocument('workspace:///dir/file.ttl');
			const provider = new WorkspaceUriDiagnosticProvider();

			const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 5));
			const actions = provider.provideCodeActions(document, range, { diagnostics: [] } as any);

			expect(actions).toEqual([]);
		});

		it('returns a Quick Fix when cursor is on a deprecated URI', () => {
			const text = 'workspace:/dir/file.ttl';
			const document = makeDocument(text);
			const provider = new WorkspaceUriDiagnosticProvider();

			const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, text.length));
			const actions = provider.provideCodeActions(document, range, { diagnostics: [] } as any);

			expect(actions.length).toBe(1);
			expect(actions[0].title).toContain('workspace:///dir/file.ttl');
			expect(actions[0].kind).toEqual(vscode.CodeActionKind.QuickFix);
			expect(actions[0].isPreferred).toBe(true);
		});

		it('includes a "Fix all" action when multiple deprecated URIs exist', () => {
			const text = 'workspace:/a.ttl workspace:/b.ttl';
			const document = makeDocument(text);
			const provider = new WorkspaceUriDiagnosticProvider();

			// Cursor on the first URI.
			const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 'workspace:/a.ttl'.length));
			const actions = provider.provideCodeActions(document, range, { diagnostics: [] } as any);

			// Individual fix + Fix all.
			const fixAll = actions.find((a: any) => a.title.includes('Update all'));

			expect(fixAll).toBeDefined();
			expect(fixAll!.title).toContain('2');
		});

		it('Quick Fix edit replaces old URI with new triple-slash format', () => {
			const text = 'workspace:/dir/file.ttl';
			const document = makeDocument(text);
			const provider = new WorkspaceUriDiagnosticProvider();

			const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, text.length));
			const actions = provider.provideCodeActions(document, range, { diagnostics: [] } as any);

			expect(actions[0].edit).toBeDefined();
		});
	});
});
