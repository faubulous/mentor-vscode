import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

const mockSubscriptions: any[] = [];

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

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

vi.mock('@src/languages/lint-rules/xsd-any-uri-literal-rule', () => ({
	XSD_ANY_URI_LITERAL_CODE: 'XsdAnyUriLiteral',
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
		uri: vscode.Uri.parse('file:///test.ttl'),
		lineCount: 1,
	} as any;
}

function makeDiagnostic(startChar: number, endChar: number, iriValue: string): vscode.Diagnostic {
	const d = new vscode.Diagnostic(
		new vscode.Range(new vscode.Position(0, startChar), new vscode.Position(0, endChar)),
		`Use the IRI reference '<${iriValue}>' instead of a typed string literal.`,
		vscode.DiagnosticSeverity.Hint,
	);
	d.code = 'XsdAnyUriLiteral';
	return d;
}

describe('XsdAnyUriCodeActionProvider', () => {
	let XsdAnyUriCodeActionProvider: any;
	let XSD_ANY_URI_LITERAL_CODE: string;

	beforeEach(async () => {
		mockSubscriptions.length = 0;
		vi.resetModules();

		const module = await import('@src/providers/refactoring/xsd-any-uri-code-action-provider');
		XsdAnyUriCodeActionProvider = module.XsdAnyUriCodeActionProvider;
		XSD_ANY_URI_LITERAL_CODE = module.XSD_ANY_URI_LITERAL_CODE;
	});

	describe('constructor', () => {
		it('creates without error', () => {
			expect(() => new XsdAnyUriCodeActionProvider()).not.toThrow();
		});

		it('registers a code action provider', () => {
			new XsdAnyUriCodeActionProvider();
			expect(mockSubscriptions.length).toBeGreaterThan(0);
		});
	});

	describe('provideCodeActions', () => {
		it('returns empty array when no matching diagnostics in context', () => {
			const document = makeDocument('<http://example.com/> a owl:Class .');
			const provider = new XsdAnyUriCodeActionProvider();

			const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 5));
			const actions = provider.provideCodeActions(document, range, { diagnostics: [] } as any);

			expect(actions).toEqual([]);
		});

		it('returns a Quick Fix when context contains an XsdAnyUriLiteral diagnostic', () => {
			const document = makeDocument('"http://example.com/"^^xsd:anyURI');
			const provider = new XsdAnyUriCodeActionProvider();

			const diagnostic = makeDiagnostic(0, 32, 'http://example.com/');
			const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 32));
			const actions = provider.provideCodeActions(document, range, { diagnostics: [diagnostic] } as any);

			expect(actions.length).toBeGreaterThanOrEqual(1);
			expect(actions[0].title).toContain('<http://example.com/>');
			expect(actions[0].kind).toEqual(vscode.CodeActionKind.QuickFix);
			expect(actions[0].isPreferred).toBe(true);
		});

		it('Quick Fix edit replaces the diagnostic range with IRI reference', () => {
			const document = makeDocument('"http://example.com/"^^xsd:anyURI');
			const provider = new XsdAnyUriCodeActionProvider();

			const diagnostic = makeDiagnostic(0, 32, 'http://example.com/');
			const range = new vscode.Range(new vscode.Position(0, 0), new vscode.Position(0, 32));
			const actions = provider.provideCodeActions(document, range, { diagnostics: [diagnostic] } as any);

			expect(actions.length).toBeGreaterThanOrEqual(1);

			const edit: any = actions[0].edit;
			const entries: any[] = edit.entries;

			expect(entries.length).toBe(1);
			expect(entries[0].newText).toBe('<http://example.com/>');
		});

		it('ignores diagnostics with a different code', () => {
			const document = makeDocument('test');
			const provider = new XsdAnyUriCodeActionProvider();

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
