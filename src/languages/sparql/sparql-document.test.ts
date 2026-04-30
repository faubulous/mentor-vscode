import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

// Mock TurtleDocument to avoid complex DI and parser dependencies
vi.mock('@src/languages/turtle/turtle-document', () => {
    class TurtleDocument {
        private _hasTokens = false;

        constructor(public readonly uri: any, public readonly syntax: any) {}

        get hasTokens(): boolean {
            return this._hasTokens;
        }

        setHasTokens(value: boolean): void {
            this._hasTokens = value;
        }

        async infer(): Promise<void> {}
        async loadTriples(_data: string): Promise<void> {}
    }
    return { TurtleDocument };
});

vi.mock('@faubulous/mentor-rdf-parsers', () => ({
    RdfSyntax: { Sparql: 'Sparql', Turtle: 'Turtle' },
}));

// Import after mocks are set up
import { SparqlDocument } from '@src/languages/sparql/sparql-document';
import { Uri } from '@src/utilities/mocks/vscode';

describe('SparqlDocument', () => {
    const uri = Uri.parse('file:///test.sparql');

    it('constructs with the given URI', () => {
        const doc = new SparqlDocument(uri as any);
        expect(doc.uri).toBe(uri);
    });

    it('constructs with Sparql syntax', () => {
        const doc = new SparqlDocument(uri as any);
        expect(doc.syntax).toBe('Sparql');
    });

    it('isLoaded returns false when no tokens', () => {
        const doc = new SparqlDocument(uri as any);
        expect(doc.isLoaded).toBe(false);
    });

    it('isLoaded matches hasTokens state', () => {
        const doc = new SparqlDocument(uri as any) as any;
        expect(doc.isLoaded).toBe(doc.hasTokens);
    });

    it('isLoaded returns true when tokens are present', () => {
        const doc = new SparqlDocument(uri as any) as any;
        // Simulate tokens being set via the parent class mock
        doc.setHasTokens(true);
        expect(doc.isLoaded).toBe(true);
    });

    it('infer resolves without doing anything', async () => {
        const doc = new SparqlDocument(uri as any);
        await expect(doc.infer()).resolves.toBeUndefined();
    });

    it('loadTriples resolves without doing anything', async () => {
        const doc = new SparqlDocument(uri as any);
        await expect(doc.loadTriples('SELECT * WHERE { ?s ?p ?o }')).resolves.toBeUndefined();
    });
});
