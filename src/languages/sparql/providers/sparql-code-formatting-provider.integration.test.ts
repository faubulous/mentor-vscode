import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import * as vscode from 'vscode';
import { SparqlCodeFormattingProvider } from '@src/languages/sparql/providers/sparql-code-formatting-provider';

/**
 * Creates a minimal text document with the given content.
 */
function makeDocument(content: string) {
    return {
        getText: () => content,
        positionAt: (offset: number) => {
            const lines = content.substring(0, offset).split('\n');

            return new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
        },
    };
}

/**
 * Formats a query with the provider and the real SPARQL formatter.
 */
function format(query: string): string {
    const options = { insertSpaces: true, tabSize: 2 } as vscode.FormattingOptions;
    const token = { isCancellationRequested: false } as vscode.CancellationToken;
    const edits = new SparqlCodeFormattingProvider().provideDocumentFormattingEdits(makeDocument(query) as any, options, token);

    return edits[0].newText;
}

describe('SparqlCodeFormattingProvider with the SPARQL formatter', () => {
    const prefixes = 'PREFIX fn: <http://example.org/fn#>\nPREFIX ex: <http://example.org/>\n';

    it('keeps the arguments of a function attached to its name', () => {
        const output = format(prefixes + 'SELECT * WHERE { BIND(fn:test() AS ?a) BIND(fn:test(?a) AS ?b) BIND(now() AS ?c) }');

        expect(output).toContain('fn:test() AS ?a');
        expect(output).toContain('fn:test(?a) AS ?b');
        expect(output).not.toMatch(/now \(\)/i);
    });

    it('keeps the space before a collection in a triple pattern', () => {
        expect(format(prefixes + 'SELECT * WHERE { ?s ex:p (1 2) }')).toContain('ex:p (1 2)');
    });
});
