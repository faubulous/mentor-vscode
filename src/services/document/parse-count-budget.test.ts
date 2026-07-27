import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import * as vscode from 'vscode';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { ParserFactory } from '@src/languages/parser-factory';
import { DocumentDiagnosticsService } from '@src/services/document/document-diagnostics-service';
import { createMockTextDocument, createTurtleDocument } from '@src/utilities/mocks/factories';
import type { TokenDelivery } from '@src/services/document/document-token-source.interface';

const VALID_TURTLE = '@prefix ex: <http://example.org/> .\nex:a ex:b ex:c .';

/**
 * Performance regression gate: one edit-delivery cycle must cost exactly ONE
 * tokenization and ONE grammar parse. The context's `parse()` captures a
 * `DocumentParseResult` that both the diagnostics pass and the triple loader
 * reuse — before this was pinned, an edit paid two tokenizations and three
 * parses across the pipeline, which multiplied by every open document and
 * every indexed file.
 */
describe('parse-count budget', () => {
	beforeEach(() => {
		(vscode.workspace as any).textDocuments = [];
	});

	afterEach(() => {
		(vscode.workspace as any).textDocuments = [];
		vi.restoreAllMocks();
	});

	function setup(content: string, uri = 'file:///w/budget.ttl') {
		const document = createMockTextDocument(content, { uri, languageId: 'turtle' });
		const context = createTurtleDocument(uri);
		const contexts: Record<string, any> = { [document.uri.toString()]: context };

		const deliveryEmitter = new vscode.EventEmitter<TokenDelivery>();
		const tokenSource = { onDidDeliverTokens: deliveryEmitter.event } as any;
		const diagnostics = new DocumentDiagnosticsService(tokenSource, key => contexts[key]);

		(vscode.workspace as any).textDocuments = [document];

		// Shared instances — the same objects every pipeline stage resolves.
		const lexer = ParserFactory.getLexer(RdfSyntax.Turtle);
		const parser = ParserFactory.getParser(RdfSyntax.Turtle);

		return {
			document,
			context,
			diagnostics,
			deliverTokens: () => deliveryEmitter.fire({ uri: document.uri.toString(), tokens: context.tokens, consumed: false }),
			tokenizeSpy: vi.spyOn(lexer, 'tokenize'),
			parseSpy: vi.spyOn(parser, 'parse'),
		};
	}

	it('one edit cycle costs exactly one tokenization and one grammar parse', async () => {
		const { document, context, deliverTokens, tokenizeSpy, parseSpy } = setup(VALID_TURTLE);

		// The token source's parse pass: one tokenize, one parse.
		context.parse(document.getText());

		// The diagnostics pass reuses the captured result (only the linters run).
		deliverTokens();

		// The triple loader reuses the captured CST.
		await context.loadTriples(document.getText());

		expect(tokenizeSpy).toHaveBeenCalledTimes(1);
		expect(parseSpy).toHaveBeenCalledTimes(1);
	});

	it('falls back to a fresh tokenization when the content is stale', () => {
		const { context, tokenizeSpy, parseSpy } = setup(VALID_TURTLE);

		context.parse(VALID_TURTLE);

		expect(tokenizeSpy).toHaveBeenCalledTimes(1);
		expect(parseSpy).toHaveBeenCalledTimes(1);

		// Different content invalidates the captured result: consumers must not
		// be served stale tokens.
		expect(context.getParseResult(VALID_TURTLE + ' ')).toBeUndefined();
		expect(context.getParseResult(VALID_TURTLE)).toBeDefined();
	});
});
