import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

// Mock vscode-languageserver/browser's TextDocuments to avoid IPC setup
vi.mock('vscode-languageserver/browser', async () => {
	const actual = await vi.importActual<any>('vscode-languageserver/browser');
	class TextDocuments {
		listen = vi.fn();
		onDidClose = vi.fn();
		onDidChangeContent = vi.fn();
		all = vi.fn(() => []);
	}
	return { ...actual, TextDocuments };
});

import { TextDocument } from 'vscode-languageserver-textdocument';
import { LanguageServerBase } from './language-server';
import { DiagnosticSeverity } from 'vscode-languageserver/browser';

/** Minimal mock for the LSP Connection */
function makeConnection() {
	return {
		onInitialize: vi.fn(),
		onInitialized: vi.fn(),
		onDidChangeConfiguration: vi.fn(),
		console: { log: vi.fn() },
		sendDiagnostics: vi.fn(),
		sendNotification: vi.fn(),
		listen: vi.fn(),
		client: { register: vi.fn() },
		workspace: { onDidChangeWorkspaceFolders: vi.fn() },
	} as any;
}

/** Expose protected methods for direct testing */
class TestServer extends LanguageServerBase {
	constructor(connection = makeConnection()) {
		super(connection, 'turtle', 'Turtle');
	}
	getLex(doc: TextDocument, tokens: any[]) { return this.getLexDiagnostics(doc, tokens); }
	getParse(doc: TextDocument, errors: any[]) { return this.getParseDiagnostics(doc, errors); }
	getLint(doc: TextDocument, content: string, tokens: any[]) { return this.getLintDiagnostics(doc, content, tokens); }
	getUnquoted(token: any) { return this.getUnquotedLiteralValue(token); }
}

function makeDoc(content = '') {
	return TextDocument.create('file:///test.ttl', 'turtle', 1, content);
}

function makeToken(name: string, image: string, offset = 0) {
	return {
		tokenType: { name },
		image,
		startOffset: offset,
		endOffset: offset + image.length - 1,
		startLine: 1,
		startColumn: 1,
		endLine: 1,
		endColumn: image.length,
	};
}

describe('LanguageServerBase', () => {
	let server: TestServer;

	beforeEach(() => {
		server = new TestServer();
	});

	describe('getLexDiagnostics', () => {
		it('returns empty array when no Unknown tokens', () => {
			const tokens = [makeToken('PNAME_LN', 'ex:Thing')];
			const diags = server.getLex(makeDoc(), tokens);
			expect(diags).toHaveLength(0);
		});

		it('returns a diagnostic for each Unknown token', () => {
			const tokens = [
				makeToken('Unknown', '???', 0),
				makeToken('PNAME_LN', 'ex:Thing', 3),
				makeToken('Unknown', '!', 11),
			];
			const diags = server.getLex(makeDoc(), tokens);
			expect(diags).toHaveLength(2);
			expect(diags[0].severity).toBe(DiagnosticSeverity.Error);
			expect(diags[0].message).toBe('Unknown token');
		});
	});

	describe('getParseDiagnostics', () => {
		it('returns empty array for no errors', () => {
			expect(server.getParse(makeDoc(), [])).toHaveLength(0);
		});

		it('maps a non-EOF error to a diagnostic', () => {
			const error = {
				message: 'Unexpected token',
				name: 'MismatchedTokenException',
				context: { ruleStack: ['prefixDecl'] },
				token: {
					tokenType: { name: 'PNAME_LN' },
					startOffset: 0,
					endOffset: 5,
				},
			};
			const diags = server.getParse(makeDoc('prefix text'), [error as any]);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toBe('Unexpected token');
			expect(diags[0].source).toBe('prefixDecl');
		});

		it('maps an EOF error with previousToken to a diagnostic', () => {
			const error = {
				message: 'Unexpected end of input',
				name: 'NotAllInputParsedException',
				context: { ruleStack: ['document'] },
				token: { tokenType: { name: 'EOF' }, startOffset: 10, endOffset: 10 },
				previousToken: { endOffset: 8 },
			};
			const doc = makeDoc('prefix text;');
			const diags = server.getParse(doc, [error as any]);
			expect(diags).toHaveLength(1);
			expect(diags[0].message).toContain('Unexpected end of input');
		});

		it('maps an EOF error without previousToken to end of document', () => {
			const error = {
				message: 'EOF error',
				name: 'EarlyExitException',
				context: null,
				token: { tokenType: { name: 'EOF' }, startOffset: 0, endOffset: 0 },
			};
			const diags = server.getParse(makeDoc(''), [error as any]);
			expect(diags).toHaveLength(1);
		});
	});

	describe('getLintDiagnostics', () => {
		it('returns empty array for no tokens', () => {
			expect(server.getLint(makeDoc(), '', [])).toHaveLength(0);
		});

		it('warns when same prefix is declared twice', () => {
			// Simulate: PREFIX ex: <http://a/> and PREFIX ex: <http://b/>
			const tokens = [
				makeToken('PREFIX', 'PREFIX', 0),
				makeToken('PNAME_NS', 'ex:', 7),
				makeToken('IRIREF', '<http://a/>', 11),
				makeToken('PREFIX', 'PREFIX', 25),
				makeToken('PNAME_NS', 'ex:', 32),
				makeToken('IRIREF', '<http://b/>', 36),
			];
			const diags = server.getLint(makeDoc(), '', tokens);
			const warnings = diags.filter(d => d.message.includes("already defined"));
			expect(warnings.length).toBeGreaterThanOrEqual(1);
		});

		it('errors when namespace URI is empty', () => {
			const tokens = [
				makeToken('PREFIX', 'PREFIX', 0),
				makeToken('PNAME_NS', 'ex:', 7),
				makeToken('IRIREF', '<>', 11),
			];
			const diags = server.getLint(makeDoc(), '', tokens);
			const errors = diags.filter(d => d.message.includes('Invalid namespace URI'));
			expect(errors.length).toBeGreaterThanOrEqual(1);
		});

		it('warns when namespace URI does not end with a separator', () => {
			const tokens = [
				makeToken('PREFIX', 'PREFIX', 0),
				makeToken('PNAME_NS', 'ex:', 7),
				makeToken('IRIREF', '<http://example.org/bad>', 11),
			];
			const diags = server.getLint(makeDoc(), '', tokens);
			const warnings = diags.filter(d => d.message.includes("should end with"));
			expect(warnings.length).toBeGreaterThanOrEqual(1);
		});

		it('does not warn when namespace URI ends with a valid separator', () => {
			const tokens = [
				makeToken('PREFIX', 'PREFIX', 0),
				makeToken('PNAME_NS', 'ex:', 7),
				makeToken('IRIREF', '<http://example.org/>', 11),
			];
			const diags = server.getLint(makeDoc(), '', tokens);
			const warnings = diags.filter(d => d.message.includes("should end with"));
			expect(warnings.length).toBe(0);
		});

		it('hints on unused prefix', () => {
			// PREFIX ex: declared but never used as PNAME_LN
			const tokens = [
				makeToken('PREFIX', 'PREFIX', 0),
				makeToken('PNAME_NS', 'ex:', 7),
				makeToken('IRIREF', '<http://example.org/>', 11),
			];
			const diags = server.getLint(makeDoc(), '', tokens);
			const hints = diags.filter(d => d.message.includes("never used"));
			expect(hints.length).toBeGreaterThanOrEqual(1);
		});

		it('does not hint unused prefix when it IS used via PNAME_LN', () => {
			const tokens = [
				makeToken('PREFIX', 'PREFIX', 0),
				makeToken('PNAME_NS', 'ex:', 7),
				makeToken('IRIREF', '<http://example.org/>', 11),
				makeToken('PNAME_LN', 'ex:Thing', 35),
			];
			const diags = server.getLint(makeDoc(), '', tokens);
			const hints = diags.filter(d => d.message.includes("never used"));
			expect(hints.length).toBe(0);
		});

		it('skips tokens with Unknown type in lint pass', () => {
			const tokens = [makeToken('Unknown', '???')];
			expect(() => server.getLint(makeDoc(), '', tokens)).not.toThrow();
		});
	});

	describe('getUnquotedLiteralValue', () => {
		it('strips single quotes from STRING_LITERAL_SINGLE_QUOTE', () => {
			const token = makeToken('STRING_LITERAL_SINGLE_QUOTE', "'hello'");
			expect(server.getUnquoted(token)).toBe('hello');
		});

		it('strips double quotes from STRING_LITERAL_QUOTE', () => {
			const token = makeToken('STRING_LITERAL_QUOTE', '"world"');
			expect(server.getUnquoted(token)).toBe('world');
		});

		it('strips triple double quotes from STRING_LITERAL_LONG_QUOTE', () => {
			const token = makeToken('STRING_LITERAL_LONG_QUOTE', '"""multi"""');
			expect(server.getUnquoted(token)).toBe('multi');
		});

		it('strips triple single quotes from STRING_LITERAL_LONG_SINGLE_QUOTE', () => {
			const token = makeToken('STRING_LITERAL_LONG_SINGLE_QUOTE', "'''multi'''");
			expect(server.getUnquoted(token)).toBe('multi');
		});

		it('returns raw image for non-literal tokens', () => {
			const token = makeToken('INTEGER', '42');
			expect(server.getUnquoted(token)).toBe('42');
		});
	});
});
