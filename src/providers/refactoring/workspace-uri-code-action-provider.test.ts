import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

const mockSubscriptions: any[] = [];

vi.mock('vscode', async () => await import('../../utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

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

vi.mock('@src/languages/lint-rules/deprecated-workspace-uri-rule', () => ({
	DEPRECATED_WORKSPACE_URI_CODE: 'DeprecatedWorkspaceUri',
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

function makeDiagnostic(startChar: number, endChar: number, canonicalUri: string): vscode.Diagnostic {
	const d = new vscode.Diagnostic(
		new vscode.Range(new vscode.Position(0, startChar), new vscode.Position(0, endChar)),
		`Deprecated workspace URI scheme. Use '${canonicalUri}' instead.`,
		vscode.DiagnosticSeverity.Warning,
	);

	d.code = 'DeprecatedWorkspaceUri';

	return d;
}

describe('WorkspaceUriCodeActionProvider', () => {
	let WorkspaceUriCodeActionProvider: any;
	let DEPRECATED_WORKSPACE_URI_CODE: string;

	beforeEach(async () => {
		mockSubscriptions.length = 0;
		vi.resetModules();

		const module = await import('./workspace-uri-code-action-provider');
		WorkspaceUriCodeActionProvider = module.WorkspaceUriCodeActionProvider;
		DEPRECATED_WORKSPACE_URI_CODE = module.DEPRECATED_WORKSPACE_URI_CODE;
	});

	describe('constructor', () => {
		it('creates without error', () => {
			expect(() => new WorkspaceUriCodeActionProvider()).not.toThrow();
		});

		it('registers a code action provider', () => {
			new WorkspaceUriCodeActionProvider();
			expect(mockSubscriptions.length).toBeGreaterThan(0);
		});
	});

	describe('provideCodeActions', () => {
		it('returns empty array when no matching diagnostics in context', () => {
			const document = makeDocument('SELECT * WHERE { ?s ?p ?o }');
			const provider = new WorkspaceUriCodeActionProvider();

			const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 5));
			const actions = provider.provideCodeActions(document, range, { diagnostics: [] } as any);

			expect(actions).toEqual([]);
		});

		it('returns a Quick Fix when context contains a DeprecatedWorkspaceUri diagnostic', () => {
			const document = makeDocument('FROM <workspace:/dir/file.ttl>');
			const provider = new WorkspaceUriCodeActionProvider();

			const diagnostic = makeDiagnostic(5, 30, 'workspace:///dir/file.ttl');
			const range = new vscode.Range(new vscode.Position(0, 5), new vscode.Position(0, 30));
			const actions = provider.provideCodeActions(document, range, { diagnostics: [diagnostic] } as any);

			expect(actions.length).toBeGreaterThanOrEqual(1);
			expect(actions[0].title).toContain('workspace:///dir/file.ttl');
			expect(actions[0].kind).toEqual(vscode.CodeActionKind.QuickFix);
			expect(actions[0].isPreferred).toBe(true);
		});

		it('Quick Fix edit replaces the diagnostic range with canonical URI', () => {
			const document = makeDocument('FROM <workspace:/dir/file.ttl>');
			const provider = new WorkspaceUriCodeActionProvider();

			const diagnostic = makeDiagnostic(5, 30, 'workspace:///dir/file.ttl');
			const range = new vscode.Range(new vscode.Position(0, 5), new vscode.Position(0, 30));
			const actions = provider.provideCodeActions(document, range, { diagnostics: [diagnostic] } as any);

			expect(actions.length).toBeGreaterThanOrEqual(1);

			const edit: any = actions[0].edit;
			const entries: any[] = edit.entries;

			expect(entries.length).toBe(1);
			expect(entries[0].newText).toBe('<workspace:///dir/file.ttl>');
		});

		it('ignores diagnostics with a different code', () => {
			const document = makeDocument('test');
			const provider = new WorkspaceUriCodeActionProvider();

			const unrelatedDiag = new vscode.Diagnostic(
				new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 4)),
				'Some other warning',
				vscode.DiagnosticSeverity.Warning,
			);
			unrelatedDiag.code = 'SomethingElse';

			const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 4));
			const actions = provider.provideCodeActions(document, range, { diagnostics: [unrelatedDiag] } as any);

			expect(actions).toEqual([]);
		});
	});
});
