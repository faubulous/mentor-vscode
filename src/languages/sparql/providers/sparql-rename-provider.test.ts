import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({ getDocumentContext: () => null })) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

import { Uri, Position, WorkspaceEdit } from '@src/utilities/mocks/vscode';
import { SparqlRenameProvider } from '@src/languages/sparql/providers/sparql-rename-provider';
import { TurtleRenameProvider } from '@src/languages/turtle/providers/turtle-rename-provider';

/** A document mock with real text/offset/position mapping. */
function makeDoc(text: string) {
    const lines = text.split('\n');

    return {
        uri: Uri.parse('file:///q.sparql'),
        getText: () => text,
        offsetAt: (pos: any) => {
            let offset = 0;
            for (let i = 0; i < pos.line; i++) offset += lines[i].length + 1;
            return offset + pos.character;
        },
        positionAt: (offset: number) => {
            const before = text.slice(0, offset);
            const split = before.split('\n');
            return new Position(split.length - 1, split[split.length - 1].length);
        },
    } as any;
}

/** Renames the variable at the `nth` occurrence of `marker` and returns the edit. */
function rename(text: string, marker: string, newName: string, nth = 1) {
    let offset = -1;
    for (let i = 0; i < nth; i++) offset = text.indexOf(marker, offset + 1);

    const provider = new SparqlRenameProvider();
    const doc = makeDoc(text);
    const edits = new WorkspaceEdit();

    // The scope path only uses `document` + `position`; context/token are unused there.
    (provider as any)._applyVariableRename(edits, doc, {} as any, {} as any, doc.positionAt(offset), newName);

    return edits;
}

describe('SparqlRenameProvider scope-aware variable rename', () => {
    it('renames every occurrence within one scope', () => {
        const query = 'SELECT ?x WHERE { ?x <urn:p> ?y . ?y <urn:q> ?x }';
        const edits = rename(query, '?x', 'id');

        expect(edits.size).toBe(3);
        // The sigil is preserved: each edit replaces only the name, not the `?`.
        expect(edits.entries.every(e => e.newText === 'id')).toBe(true);
    });

    it('bridges a projected sub-SELECT variable to its parent', () => {
        const query = 'SELECT ?x WHERE { ?x <urn:p> ?y . { SELECT ?x ?w WHERE { ?x <urn:q> ?w } } }';

        expect(rename(query, '?x', 'id').size).toBe(4);
    });

    it('isolates a non-projected sub-SELECT variable', () => {
        const query = 'SELECT ?x WHERE { ?x <urn:p> ?y . { SELECT ?z WHERE { ?z <urn:q> ?w . ?w <urn:r> ?z } } }';

        // Inner ?w (4th/5th ?-vars) renames in isolation: two sites, nothing outside.
        expect(rename(query, '?w', 'k').size).toBe(2);
    });

    it('renames the label only, keeping the ?/$ sigil out of the edit range', () => {
        const query = 'SELECT ?x WHERE { ?x <urn:p> ?y }';
        const edits = rename(query, '?x', 'id');
        const first = edits.entries[0];

        // The edit starts one character after the `?` (column 8 for the SELECT ?x at index 7).
        expect(first.range!.start.character).toBe(8);
        expect(first.range!.end.character).toBe(9);
    });

    it('falls back to textual rename when the document does not parse', () => {
        const spy = vi
            .spyOn(TurtleRenameProvider.prototype as any, '_applyVariableRename')
            .mockImplementation(() => {});

        const provider = new SparqlRenameProvider();
        const doc = makeDoc('SELECT ?x WHERE { ?x <urn:p'); // truncated, unparseable
        const edits = new WorkspaceEdit();

        (provider as any)._applyVariableRename(edits, doc, {} as any, {} as any, new Position(0, 8), 'id');

        expect(spy).toHaveBeenCalledTimes(1);

        spy.mockRestore();
    });
});
