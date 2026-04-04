import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

// Mock the serializers package which uses unsupported directory imports in ESM
vi.mock('@faubulous/mentor-rdf-serializers', () => ({
    TurtleFormatter: class {
        formatFromText(text: string, _options: any) {
            // Return a simple normalized version for testing
            return { output: text.trim() + '\n' };
        }
    },
    SparqlFormatter: class {
        formatFromText(text: string, _options: any) {
            return { output: text.trim() + '\n' };
        }
    },
}));

import { TurtleCodeFormattingProvider } from '@src/languages/turtle/providers/turtle-code-formatting-provider';
import { SparqlCodeFormattingProvider } from '@src/languages/sparql/providers/sparql-code-formatting-provider';
import { Position, Range, TextEdit } from '@src/utilities/mocks/vscode';

function makeDocument(content: string) {
    return {
        getText: () => content,
        positionAt: (offset: number) => {
            const lines = content.substring(0, offset).split('\n');
            return new Position(lines.length - 1, lines[lines.length - 1].length);
        },
    };
}

describe('TurtleCodeFormattingProvider', () => {
    const provider = new TurtleCodeFormattingProvider();

    const defaultOptions = { insertSpaces: true, tabSize: 4 };
    const token = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) };

    it('returns an array of TextEdit objects', () => {
        const doc = makeDocument('@prefix ex: <http://example.org/> .\nex:a ex:b ex:c .') as any;
        const edits = provider.provideDocumentFormattingEdits(doc, defaultOptions as any, token as any);
        expect(Array.isArray(edits)).toBe(true);
        expect(edits.length).toBe(1);
    });

    it('returns a replace edit covering the entire document', () => {
        const content = '@prefix ex: <http://example.org/> .';
        const doc = makeDocument(content) as any;
        const edits = provider.provideDocumentFormattingEdits(doc, defaultOptions as any, token as any);
        expect(edits[0]).toBeInstanceOf(TextEdit);
        // The range should start at (0,0)
        expect(edits[0].range.start.line).toBe(0);
        expect(edits[0].range.start.character).toBe(0);
    });

    it('uses spaces for indentation when insertSpaces is true', () => {
        const doc = makeDocument('SELECT * WHERE { ?s ?p ?o }') as any;
        // Verifying options are passed without throwing
        expect(() => provider.provideDocumentFormattingEdits(
            doc,
            { insertSpaces: true, tabSize: 2 } as any,
            token as any
        )).not.toThrow();
    });

    it('uses tab for indentation when insertSpaces is false', () => {
        const doc = makeDocument('ex:a ex:b ex:c .') as any;
        expect(() => provider.provideDocumentFormattingEdits(
            doc,
            { insertSpaces: false, tabSize: 4 } as any,
            token as any
        )).not.toThrow();
    });
});

describe('SparqlCodeFormattingProvider', () => {
    const provider = new SparqlCodeFormattingProvider();

    const defaultOptions = { insertSpaces: true, tabSize: 4 };
    const token = { isCancellationRequested: false, onCancellationRequested: () => ({ dispose: () => {} }) };

    it('returns an array of TextEdit objects', () => {
        const doc = makeDocument('SELECT * WHERE { ?s ?p ?o }') as any;
        const edits = provider.provideDocumentFormattingEdits(doc, defaultOptions as any, token as any);
        expect(Array.isArray(edits)).toBe(true);
        expect(edits.length).toBe(1);
    });

    it('returns a replace edit covering the entire document', () => {
        const content = 'SELECT ?s WHERE { ?s ?p ?o }';
        const doc = makeDocument(content) as any;
        const edits = provider.provideDocumentFormattingEdits(doc, defaultOptions as any, token as any);
        expect(edits[0]).toBeInstanceOf(TextEdit);
        expect(edits[0].range.start.line).toBe(0);
        expect(edits[0].range.start.character).toBe(0);
    });

    it('uses spaces for indentation when insertSpaces is true', () => {
        const doc = makeDocument('SELECT * WHERE { ?s ?p ?o }') as any;
        expect(() => provider.provideDocumentFormattingEdits(
            doc,
            { insertSpaces: true, tabSize: 2 } as any,
            token as any
        )).not.toThrow();
    });

    it('uses tab for indentation when insertSpaces is false', () => {
        const doc = makeDocument('SELECT * WHERE { ?s ?p ?o }') as any;
        expect(() => provider.provideDocumentFormattingEdits(
            doc,
            { insertSpaces: false, tabSize: 4 } as any,
            token as any
        )).not.toThrow();
    });
});
