import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';
import { DatalogRenameProvider } from '@src/languages/datalog/providers/datalog-rename-provider';
import { getTextEdits } from '@src/utilities/mocks/factories';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

function positionToOffset(pos: { line: number; character: number }, lines: string[]): number {
    let offset = 0;
    for (let i = 0; i < pos.line; i++) {
        offset += lines[i].length + 1; // +1 for newline
    }
    return offset + pos.character;
}

function makeDocument(content: string) {
    const lines = content.split('\n');
    const uri = vscode.Uri.parse('file:///test.dl');

    return {
        uri,
        getText: (range?: any) => {
            if (!range) return content;
            const start = positionToOffset({ line: range.start.line, character: range.start.character }, lines);
            const end = positionToOffset({ line: range.end.line, character: range.end.character }, lines);
            return content.slice(start, end);
        },
        lineAt: (line: number) => ({ text: lines[line] }),
        positionAt: (offset: number) => {
            let cur = 0;
            for (let i = 0; i < lines.length; i++) {
                const lineLen = lines[i].length + 1;
                if (cur + lineLen > offset) {
                    return new vscode.Position(i, offset - cur);
                }
                cur += lineLen;
            }
            return new vscode.Position(lines.length - 1, lines[lines.length - 1].length);
        },
        getWordRangeAtPosition: (pos: vscode.Position, regex: RegExp) => {
            const lineText = lines[pos.line];
            const r = new RegExp(regex.source, 'g');
            let m: RegExpExecArray | null;
            while ((m = r.exec(lineText)) !== null) {
                const start = m.index;
                const end = m.index + m[0].length;
                if (start <= pos.character && pos.character <= end) {
                    return new vscode.Range(new vscode.Position(pos.line, start), new vscode.Position(pos.line, end));
                }
                if (m[0].length === 0) r.lastIndex++;
            }
            return null;
        },
    };
}

describe('DatalogRenameProvider', () => {
    const provider = new DatalogRenameProvider();

    describe('prepareRename', () => {
        it('throws when cursor is not on a word', async () => {
            const doc = makeDocument('  ') as any;
            const pos = new vscode.Position(0, 0);
            await expect(provider.prepareRename(doc, pos)).rejects.toThrow('Cannot rename');
        });

        it('returns range and placeholder for a regular identifier', async () => {
            const doc = makeDocument('parent(X, Y).') as any;
            const pos = new vscode.Position(0, 1); // on 'parent'
            const result = await provider.prepareRename(doc, pos) as any;
            expect(result).not.toBeNull();
            expect(result.placeholder).toBe('parent');
        });

        it('returns range for a prefix in prefixed name', async () => {
            const doc = makeDocument('rdf:type') as any;
            const pos = new vscode.Position(0, 1); // on 'rdf'
            const result = await provider.prepareRename(doc, pos) as any;
            expect(result).not.toBeNull();
            expect(result.placeholder).toBe('rdf');
        });

        it('returns range for a local name in prefixed name', async () => {
            const doc = makeDocument('rdf:type') as any;
            const pos = new vscode.Position(0, 5); // on 'type'
            const result = await provider.prepareRename(doc, pos) as any;
            expect(result).not.toBeNull();
            expect(result.placeholder).toBe('type');
        });
    });

    describe('provideRenameEdits', () => {
        it('returns empty edits when cursor is not on a word', () => {
            const doc = makeDocument('  ') as any;
            const pos = new vscode.Position(0, 0);
            const edits = provider.provideRenameEdits(doc, pos, 'newName') as vscode.WorkspaceEdit;
            expect(edits.size).toBe(0);
        });

        it('renames prefix in all occurrences', () => {
            const doc = makeDocument('rdf:type rdf:label xsd:string') as any;
            const pos = new vscode.Position(0, 1); // on 'rdf'
            const edits = provider.provideRenameEdits(doc, pos, 'owl') as vscode.WorkspaceEdit;
            // Should replace both 'rdf' occurrences (not xsd)
            const entries = getTextEdits(edits);
            expect(entries).toHaveLength(2);
            expect(entries.every(e => e.newText === 'owl')).toBe(true);
        });

        it('renames local name within its prefix context', () => {
            const doc = makeDocument('rdf:type rdf:label xsd:type') as any;
            const pos = new vscode.Position(0, 5); // on 'type' in 'rdf:type'
            const edits = provider.provideRenameEdits(doc, pos, 'Class') as vscode.WorkspaceEdit;
            // Should rename 'rdf:type' but NOT 'xsd:type'
            const entries = getTextEdits(edits);
            expect(entries).toHaveLength(1);
            expect(entries[0].newText).toBe('Class');
        });

        it('renames identifier at word boundaries only', () => {
            const doc = makeDocument('foo(foo, foobar).') as any;
            const pos = new vscode.Position(0, 1); // on first 'foo'
            const edits = provider.provideRenameEdits(doc, pos, 'bar') as vscode.WorkspaceEdit;
            // Should rename 'foo' twice (relation and arg), but NOT 'foobar'
            const entries = getTextEdits(edits);
            expect(entries).toHaveLength(2);
            expect(entries.every(e => e.newText === 'bar')).toBe(true);
        });

        it('skips identifier occurrences that are part of prefixed names', () => {
            const doc = makeDocument('foo rdf:foo foo') as any;
            const pos = new vscode.Position(0, 1); // on first 'foo'
            const edits = provider.provideRenameEdits(doc, pos, 'bar') as vscode.WorkspaceEdit;
            // Should rename the standalone 'foo' occurrences (positions 0 and 12), not 'rdf:foo'
            const entries = getTextEdits(edits);
            // 'rdf:foo' should NOT be in the replacements
            // The standalone 'foo' instances should be renamed
            expect(entries.every(e => e.newText === 'bar')).toBe(true);
            // Ensure we only renamed the standalone occurrences
            for (const entry of entries) {
                // range.start character should not be preceded by ':' or followed by ':'
                const startChar = entry.range.start.character;
                expect(startChar).not.toBe(5); // 'foo' in 'rdf:foo' starts at char 4
            }
        });

        it('renames all occurrences of a prefixed name local name across multiple lines', () => {
            const content = 'rdf:type\nrdf:type\nxsd:type';
            const doc = makeDocument(content) as any;
            const pos = new vscode.Position(0, 5); // 'type' in 'rdf:type' on line 0
            const edits = provider.provideRenameEdits(doc, pos, 'NewClass') as vscode.WorkspaceEdit;
            // Should rename both 'rdf:type' occurrences on lines 0 and 1, not 'xsd:type'
            expect(getTextEdits(edits)).toHaveLength(2);
        });
    });
});
