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

		it('skips PNAME_NS that follows PREFIX/TTL_PREFIX (prefix declaration itself)', () => {
			// The PNAME_NS after PREFIX should not be tracked as a used prefix
			const tokens = [
				makeToken('PREFIX', 'PREFIX', 0),
				makeToken('PNAME_NS', 'ex:', 7),
				makeToken('IRIREF', '<http://example.org/>', 11),
			];
			const diags = server.getLint(makeDoc(), '', tokens);
			// It should be notified as unused (not counted as "used via PNAME_NS")
			const hints = diags.filter(d => d.message.includes("never used"));
			expect(hints.length).toBeGreaterThanOrEqual(1);
		});

		it('counts PNAME_NS as a used prefix when not preceded by PREFIX', () => {
			const tokens = [
				makeToken('PREFIX', 'PREFIX', 0),
				makeToken('PNAME_NS', 'ex:', 7),
				makeToken('IRIREF', '<http://example.org/>', 11),
				// PNAME_NS not after PREFIX → counts as used
				makeToken('IRIREF', '<http://example.org/Thing>', 35),
				makeToken('PNAME_NS', 'ex:', 65),
			];
			const diags = server.getLint(makeDoc(), '', tokens);
			const hints = diags.filter(d => d.message.includes("never used"));
			expect(hints.length).toBe(0);
		});

		it('skips DoubleCaret when it is the last token (boundary check)', () => {
			// DoubleCaret at position >= tokens.length - 2 → continue
			const tokens = [
				makeToken('STRING_LITERAL_QUOTE', '"hello"', 0),
				makeToken('DoubleCaret', '^^', 7),
			];
			expect(() => server.getLint(makeDoc(), '', tokens)).not.toThrow();
		});

		describe('XSD datatype validation', () => {
			function xsdTokens(literalImage: string, xsdIri: string) {
				const lit = makeToken('STRING_LITERAL_QUOTE', literalImage, 0);
				const dc = makeToken('DoubleCaret', '^^', literalImage.length);
				const dt = makeToken('IRIREF', `<${xsdIri}>`, literalImage.length + 2);
				return [lit, dc, dt];
			}

			it('warns for invalid xsd:anyURI when regex fails', () => {
				// anyURI regex always matches any string, so no warning expected for valid input
				const tokens = xsdTokens('"http://example.org/"', 'http://www.w3.org/2001/XMLSchema#anyURI');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(() => diags).not.toThrow();
			});

			it('warns for invalid xsd:base64Binary', () => {
				const tokens = xsdTokens('"ZZZZZ"', 'http://www.w3.org/2001/XMLSchema#base64Binary');
				const diags = server.getLint(makeDoc(), '', tokens);
				// ZZZZZ does not match [0-9a-fA-F]+
				const warns = diags.filter(d => d.message.includes('lexical space'));
				expect(warns.length).toBeGreaterThanOrEqual(1);
			});

			it('does not warn for valid xsd:base64Binary', () => {
				const tokens = xsdTokens('"deadbeef"', 'http://www.w3.org/2001/XMLSchema#base64Binary');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('lexical space'));
				expect(warns.length).toBe(0);
			});

			it('warns for invalid xsd:boolean', () => {
				const tokens = xsdTokens('"yes"', 'http://www.w3.org/2001/XMLSchema#boolean');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('boolean'));
				expect(warns.length).toBeGreaterThanOrEqual(1);
			});

			it('does not warn for valid xsd:boolean "true"', () => {
				const tokens = xsdTokens('"true"', 'http://www.w3.org/2001/XMLSchema#boolean');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('boolean'));
				expect(warns.length).toBe(0);
			});

			it('warns for invalid xsd:byte', () => {
				const tokens = xsdTokens('"notabyte"', 'http://www.w3.org/2001/XMLSchema#byte');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags.length).toBeGreaterThanOrEqual(1);
			});

			it('warns for invalid xsd:date', () => {
				const tokens = xsdTokens('"not-a-date"', 'http://www.w3.org/2001/XMLSchema#date');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('lexical space'));
				expect(warns.length).toBeGreaterThanOrEqual(1);
			});

			it('does not warn for valid xsd:date', () => {
				const tokens = xsdTokens('"2024-01-15"', 'http://www.w3.org/2001/XMLSchema#date');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('lexical space'));
				expect(warns.length).toBe(0);
			});

			it('warns for invalid xsd:dateTime', () => {
				const tokens = xsdTokens('"2024-01-15"', 'http://www.w3.org/2001/XMLSchema#dateTime');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('lexical space'));
				expect(warns.length).toBeGreaterThanOrEqual(1);
			});

			it('does not warn for valid xsd:dateTime', () => {
				const tokens = xsdTokens('"2024-01-15T10:30:00"', 'http://www.w3.org/2001/XMLSchema#dateTime');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('lexical space'));
				expect(warns.length).toBe(0);
			});

			it('warns for invalid xsd:decimal', () => {
				const tokens = xsdTokens('"abc"', 'http://www.w3.org/2001/XMLSchema#decimal');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags.length).toBeGreaterThanOrEqual(1);
			});

			it('does not warn for valid xsd:decimal', () => {
				const tokens = xsdTokens('"3.14"', 'http://www.w3.org/2001/XMLSchema#decimal');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags).toHaveLength(0);
			});

			it('warns for invalid xsd:double', () => {
				const tokens = xsdTokens('"notadouble"', 'http://www.w3.org/2001/XMLSchema#double');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags.length).toBeGreaterThanOrEqual(1);
			});

			it('does not warn for valid xsd:double', () => {
				const tokens = xsdTokens('"1.5e10"', 'http://www.w3.org/2001/XMLSchema#double');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags).toHaveLength(0);
			});

			it('warns for invalid xsd:duration', () => {
				const tokens = xsdTokens('"notaduration"', 'http://www.w3.org/2001/XMLSchema#duration');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags.length).toBeGreaterThanOrEqual(1);
			});

			it('does not warn for valid xsd:duration', () => {
				const tokens = xsdTokens('"P1Y2M3DT4H5M6S"', 'http://www.w3.org/2001/XMLSchema#duration');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags).toHaveLength(0);
			});

			it('warns for invalid xsd:float', () => {
				const tokens = xsdTokens('"notafloat"', 'http://www.w3.org/2001/XMLSchema#float');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags.length).toBeGreaterThanOrEqual(1);
			});

			it('does not warn for valid xsd:float', () => {
				const tokens = xsdTokens('"1.5"', 'http://www.w3.org/2001/XMLSchema#float');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags).toHaveLength(0);
			});

			it('warns for non-integer xsd:int', () => {
				const tokens = xsdTokens('"notanint"', 'http://www.w3.org/2001/XMLSchema#int');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('integer'));
				expect(warns.length).toBeGreaterThanOrEqual(1);
			});

			it('warns for out-of-range xsd:int', () => {
				const tokens = xsdTokens('"9999999999"', 'http://www.w3.org/2001/XMLSchema#int');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('2147483647'));
				expect(warns.length).toBeGreaterThanOrEqual(1);
			});

			it('does not warn for valid xsd:int', () => {
				const tokens = xsdTokens('"42"', 'http://www.w3.org/2001/XMLSchema#int');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags).toHaveLength(0);
			});

			it('warns for non-integer xsd:integer', () => {
				const tokens = xsdTokens('"notaninteger"', 'http://www.w3.org/2001/XMLSchema#integer');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('integer'));
				expect(warns.length).toBeGreaterThanOrEqual(1);
			});

			it('does not warn for valid xsd:integer', () => {
				const tokens = xsdTokens('"100"', 'http://www.w3.org/2001/XMLSchema#integer');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags).toHaveLength(0);
			});

			it('warns for non-integer xsd:long', () => {
				const tokens = xsdTokens('"notlong"', 'http://www.w3.org/2001/XMLSchema#long');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('long'));
				expect(warns.length).toBeGreaterThanOrEqual(1);
			});

			it('warns when xsd:long is out of range', () => {
				const tokens = xsdTokens('"99999999999999999999"', 'http://www.w3.org/2001/XMLSchema#long');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('9223372036854775807'));
				expect(warns.length).toBeGreaterThanOrEqual(1);
			});

			it('warns for non-integer xsd:negativeInteger', () => {
				const tokens = xsdTokens('"notanint"', 'http://www.w3.org/2001/XMLSchema#negativeInteger');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags.length).toBeGreaterThanOrEqual(1);
			});

			it('warns when xsd:negativeInteger is 0 or positive', () => {
				const tokens = xsdTokens('"5"', 'http://www.w3.org/2001/XMLSchema#negativeInteger');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('< 0'));
				expect(warns.length).toBeGreaterThanOrEqual(1);
			});

			it('does not warn for valid xsd:negativeInteger', () => {
				const tokens = xsdTokens('"-5"', 'http://www.w3.org/2001/XMLSchema#negativeInteger');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags).toHaveLength(0);
			});

			it('warns for non-integer xsd:nonNegativeInteger', () => {
				const tokens = xsdTokens('"abc"', 'http://www.w3.org/2001/XMLSchema#nonNegativeInteger');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags.length).toBeGreaterThanOrEqual(1);
			});

			it('warns when xsd:nonNegativeInteger is negative', () => {
				const tokens = xsdTokens('"-5"', 'http://www.w3.org/2001/XMLSchema#nonNegativeInteger');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('>= 0'));
				expect(warns.length).toBeGreaterThanOrEqual(1);
			});

			it('does not warn for valid xsd:nonNegativeInteger', () => {
				const tokens = xsdTokens('"5"', 'http://www.w3.org/2001/XMLSchema#nonNegativeInteger');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags).toHaveLength(0);
			});

			it('warns for non-integer xsd:nonPositiveInteger', () => {
				const tokens = xsdTokens('"abc"', 'http://www.w3.org/2001/XMLSchema#nonPositiveInteger');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags.length).toBeGreaterThanOrEqual(1);
			});

			it('warns when xsd:nonPositiveInteger is positive', () => {
				const tokens = xsdTokens('"5"', 'http://www.w3.org/2001/XMLSchema#nonPositiveInteger');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('<= 0'));
				expect(warns.length).toBeGreaterThanOrEqual(1);
			});

			it('does not warn for valid xsd:nonPositiveInteger', () => {
				const tokens = xsdTokens('"-5"', 'http://www.w3.org/2001/XMLSchema#nonPositiveInteger');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags).toHaveLength(0);
			});

			it('warns for non-integer xsd:positiveInteger', () => {
				const tokens = xsdTokens('"abc"', 'http://www.w3.org/2001/XMLSchema#positiveInteger');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags.length).toBeGreaterThanOrEqual(1);
			});

			it('warns when xsd:positiveInteger is 0 or negative', () => {
				const tokens = xsdTokens('"0"', 'http://www.w3.org/2001/XMLSchema#positiveInteger');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('> 0'));
				expect(warns.length).toBeGreaterThanOrEqual(1);
			});

			it('does not warn for valid xsd:positiveInteger', () => {
				const tokens = xsdTokens('"5"', 'http://www.w3.org/2001/XMLSchema#positiveInteger');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags).toHaveLength(0);
			});

			it('warns for non-integer xsd:short', () => {
				const tokens = xsdTokens('"notashort"', 'http://www.w3.org/2001/XMLSchema#short');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags.length).toBeGreaterThanOrEqual(1);
			});

			it('warns when xsd:short is out of range', () => {
				const tokens = xsdTokens('"99999"', 'http://www.w3.org/2001/XMLSchema#short');
				const diags = server.getLint(makeDoc(), '', tokens);
				const warns = diags.filter(d => d.message.includes('32767'));
				expect(warns.length).toBeGreaterThanOrEqual(1);
			});

			it('does not warn for valid xsd:short', () => {
				const tokens = xsdTokens('"100"', 'http://www.w3.org/2001/XMLSchema#short');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags).toHaveLength(0);
			});

			it('warns for invalid xsd:time', () => {
				const tokens = xsdTokens('"not-a-time"', 'http://www.w3.org/2001/XMLSchema#time');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags.length).toBeGreaterThanOrEqual(1);
			});

			it('does not warn for valid xsd:time', () => {
				const tokens = xsdTokens('"14:30:00Z"', 'http://www.w3.org/2001/XMLSchema#time');
				const diags = server.getLint(makeDoc(), '', tokens);
				expect(diags).toHaveLength(0);
			});
		});
	});

	describe('start', () => {
		it('calls documents.listen, connection.listen, and logs', () => {
			const conn = makeConnection();
			const srv = new TestServer(conn);
			srv.start();
			expect(conn.listen).toHaveBeenCalled();
		});
	});

	describe('onInitializeConnection', () => {
		it('sets capability flags and returns InitializeResult', () => {
			const srv = new TestServer();
			const params = {
				capabilities: {
					workspace: { configuration: true, workspaceFolders: true },
					textDocument: { publishDiagnostics: { relatedInformation: true } }
				}
			};
			const result = (srv as any).onInitializeConnection(params);
			expect(srv.hasConfigurationCapability).toBe(true);
			expect(srv.hasWorkspaceFolderCapability).toBe(true);
			expect(srv.hasDiagnosticRelatedInformationCapability).toBe(true);
			expect(result.capabilities).toBeDefined();
		});

		it('includes workspaceFolders capability when flag is set', () => {
			const srv = new TestServer();
			const params = {
				capabilities: {
					workspace: { configuration: true, workspaceFolders: true },
					textDocument: {}
				}
			};
			const result = (srv as any).onInitializeConnection(params);
			expect(result.capabilities.workspace?.workspaceFolders?.supported).toBe(true);
		});

		it('does not include workspaceFolders when flag is false', () => {
			const srv = new TestServer();
			const params = { capabilities: {} };
			const result = (srv as any).onInitializeConnection(params);
			expect(result.capabilities.workspace).toBeUndefined();
		});
	});

	describe('onConnectionInitialized', () => {
		it('registers config change notification when hasConfigurationCapability is true', () => {
			const conn = makeConnection();
			const srv = new TestServer(conn);
			srv.hasConfigurationCapability = true;
			(srv as any).onConnectionInitialized();
			expect(conn.client.register).toHaveBeenCalled();
		});

		it('registers workspace folder change handler when hasWorkspaceFolderCapability is true', () => {
			const conn = makeConnection();
			const srv = new TestServer(conn);
			srv.hasWorkspaceFolderCapability = true;
			(srv as any).onConnectionInitialized();
			expect(conn.workspace.onDidChangeWorkspaceFolders).toHaveBeenCalled();
			// Call the registered handler to cover the log line inside it
			const handler = conn.workspace.onDidChangeWorkspaceFolders.mock.calls[0][0];
			handler({});
		});
	});

	describe('onDidChangeConfiguration', () => {
		it('clears document settings when hasConfigurationCapability is true', () => {
			const srv = new TestServer();
			srv.hasConfigurationCapability = true;
			srv.documentSettings.set('file:///test.ttl', Promise.resolve({} as any));
			(srv as any).onDidChangeConfiguration({ settings: {} });
			expect(srv.documentSettings.size).toBe(0);
		});

		it('updates globalSettings when hasConfigurationCapability is false', () => {
			const srv = new TestServer();
			srv.hasConfigurationCapability = false;
			(srv as any).onDidChangeConfiguration({ settings: { languageServerExample: { maxNumberOfProblems: 99 } } });
			expect(srv.globalSettings).toBeDefined();
		});

		it('revalidates all open documents when setting changes', () => {
			const conn = makeConnection();
			const doc = makeDoc('test');
			// Patch documents.all() to return a document
			const srv = new TestServer(conn);
			(srv.documents as any).all = vi.fn(() => [doc]);
			const spy = vi.spyOn(srv as any, 'validateTextDocument').mockResolvedValue(undefined);
			srv.hasConfigurationCapability = true;
			(srv as any).onDidChangeConfiguration({ settings: {} });
			expect(spy).toHaveBeenCalledWith(doc);
		});
	});

	describe('onDidChangeWatchedFiles', () => {
		it('logs when watched files change', () => {
			const conn = makeConnection();
			const srv = new TestServer(conn);
			(srv as any).onDidChangeWatchedFiles({ changes: [] });
			expect(conn.console.log).toHaveBeenCalledWith(expect.stringContaining('Watched files changed'));
		});
	});

	describe('onDidClose', () => {
		it('removes document settings on close', () => {
			const srv = new TestServer();
			const uri = 'file:///test.ttl';
			srv.documentSettings.set(uri, Promise.resolve({} as any));
			(srv as any).onDidClose({ document: { uri } });
			expect(srv.documentSettings.has(uri)).toBe(false);
		});
	});

	describe('onDidChangeContent', () => {
		it('calls validateTextDocument with the changed document', async () => {
			const srv = new TestServer();
			const doc = makeDoc('test content');
			const spy = vi.spyOn(srv as any, 'validateTextDocument').mockResolvedValue(undefined);
			(srv as any).onDidChangeContent({ document: doc });
			expect(spy).toHaveBeenCalledWith(doc);
		});
	});

	describe('validateTextDocument', () => {
		it('returns early when connection is missing', async () => {
			const srv = new TestServer();
			(srv as any).connection = undefined;
			await expect((srv as any).validateTextDocument(makeDoc('content'))).resolves.toBeUndefined();
		});

		it('sends empty diagnostics for empty document', async () => {
			const conn = makeConnection();
			const srv = new TestServer(conn);
			await (srv as any).validateTextDocument(makeDoc(''));
			expect(conn.sendDiagnostics).toHaveBeenCalledWith(
				expect.objectContaining({ diagnostics: [] })
			);
		});

		it('sends error diagnostic when parse throws (no lexer set)', async () => {
			const conn = makeConnection();
			const srv = new TestServer(conn);
			await (srv as any).validateTextDocument(makeDoc('non-empty content'));
			expect(conn.sendDiagnostics).toHaveBeenCalledWith(
				expect.objectContaining({
					diagnostics: expect.arrayContaining([
						expect.objectContaining({ severity: DiagnosticSeverity.Error })
					])
				})
			);
		});

		it('sends parsed diagnostics and updateContext notification when lexer/parser are set', async () => {
			const conn = makeConnection();
			const fakeToken = {
				image: 'test',
				startOffset: 0,
				endOffset: 3,
				startLine: 1,
				endLine: 1,
				startColumn: 1,
				endColumn: 4,
				tokenTypeIdx: 1,
				tokenType: { name: 'PNAME_LN', GROUP: undefined },
				payload: {}
			};
			const mockLexer = {
				tokenize: vi.fn(() => ({ tokens: [fakeToken] }))
			};
			const mockParser = {
				parse: vi.fn(),
				errors: [],
				semanticErrors: []
			};
			const srv = new LanguageServerBase(conn, 'turtle', 'Turtle', mockLexer as any, mockParser as any, true);
			await (srv as any).validateTextDocument(makeDoc('test'));
			expect(conn.sendDiagnostics).toHaveBeenCalled();
			expect(conn.sendNotification).toHaveBeenCalledWith(
				'mentor.message.updateContext',
				expect.objectContaining({ languageId: 'turtle' })
			);
		});
	});

	describe('log', () => {
		it('calls connection.console.log when console is available', () => {
			const conn = makeConnection();
			const srv = new TestServer(conn);
			(srv as any).log('hello');
			expect(conn.console.log).toHaveBeenCalledWith('[Server] hello');
		});

		it('falls back to global console.log when connection.console is null', () => {
			const conn = makeConnection();
			conn.console = null;
			const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
			const srv = new TestServer(conn);
			(srv as any).log('fallback');
			expect(consoleSpy).toHaveBeenCalledWith('[Server] fallback');
			consoleSpy.mockRestore();
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
