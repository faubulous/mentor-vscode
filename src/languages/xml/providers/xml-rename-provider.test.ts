import { describe, it, expect, vi } from 'vitest';
import { Position, Uri } from '@src/utilities/mocks/vscode';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

// Stub tsyringe container to prevent DI errors on import
vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
    injectable: () => (_target: any) => _target,
    inject: () => (_target: any, _key: any, _index: any) => {},
    singleton: () => (_target: any) => _target,
}));

import { XmlRenameProvider } from './xml-rename-provider';

function positionToOffset(pos: { line: number; character: number }, lines: string[]): number {
    let offset = 0;
    for (let i = 0; i < pos.line; i++) {
        offset += lines[i].length + 1;
    }
    return offset + pos.character;
}

function makeDocument(content: string) {
    const lines = content.split('\n');
    return {
        uri: Uri.parse('file:///test.rdf'),
        getText: (_range?: any) => content,
        positionAt: (offset: number) => {
            let cur = 0;
            for (let i = 0; i < lines.length; i++) {
                const lineLen = lines[i].length + 1;
                if (cur + lineLen > offset) {
                    return new Position(i, offset - cur);
                }
                cur += lineLen;
            }
            return new Position(lines.length - 1, lines[lines.length - 1].length);
        },
        lineAt: (line: number) => ({ text: lines[line] }),
    };
}

describe('XmlRenameProvider', () => {
    const provider = new XmlRenameProvider();

    describe('getWorkspaceEdits', () => {
        it('returns empty edits when no replacements are given', () => {
            const doc = makeDocument('<rdf:RDF />') as any;
            const edits = provider.getWorkspaceEdits(doc, []);
            expect(edits.size).toBe(0);
        });

        it('applies a single regex replacement', () => {
            const content = 'xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"';
            const doc = makeDocument(content) as any;
            const replacement = {
                fromExpression: /xmlns:rdf/g,
                toValue: 'xmlns:owl',
            };
            const edits = provider.getWorkspaceEdits(doc, [replacement]);
            expect(edits.size).toBe(1);
            const entries = (edits as any).entries as any[];
            expect(entries[0].newText).toBe('xmlns:owl');
        });

        it('applies multiple occurrences of the same pattern', () => {
            const content = 'rdf:type rdf:about rdf:resource';
            const doc = makeDocument(content) as any;
            const replacement = {
                fromExpression: /rdf:/g,
                toValue: 'owl:',
            };
            const edits = provider.getWorkspaceEdits(doc, [replacement]);
            expect(edits.size).toBe(3);
            const entries = (edits as any).entries as any[];
            expect(entries.every((e: any) => e.newText === 'owl:')).toBe(true);
        });

        it('applies multiple different replacements', () => {
            const content = 'xmlns:ex="http://example.org/" ex:foo ex:bar';
            const doc = makeDocument(content) as any;
            const replacements = [
                { fromExpression: /xmlns:ex/g, toValue: 'xmlns:myns' },
                { fromExpression: /ex:/g, toValue: 'myns:' },
            ];
            const edits = provider.getWorkspaceEdits(doc, replacements);
            // 1 match for xmlns:ex, 2 matches for ex: (in ex:foo, ex:bar)
            expect(edits.size).toBe(3);
        });

        it('produces correct position ranges for replacements', () => {
            const content = 'rdf:type\nrdf:about';
            const doc = makeDocument(content) as any;
            const replacement = {
                fromExpression: /rdf/g,
                toValue: 'owl',
            };
            const edits = provider.getWorkspaceEdits(doc, [replacement]);
            expect(edits.size).toBe(2);
            const entries = (edits as any).entries as any[];
            // First match should be on line 0, char 0–3
            expect(entries[0].range.start.line).toBe(0);
            expect(entries[0].range.start.character).toBe(0);
            expect(entries[0].range.end.character).toBe(3);
            // Second match on line 1, char 0–3
            expect(entries[1].range.start.line).toBe(1);
            expect(entries[1].range.start.character).toBe(0);
        });

        it('returns empty edits when pattern has no matches', () => {
            const content = '<owl:Class />';
            const doc = makeDocument(content) as any;
            const replacement = {
                fromExpression: /rdf:/g,
                toValue: 'owl:',
            };
            const edits = provider.getWorkspaceEdits(doc, [replacement]);
            expect(edits.size).toBe(0);
        });
    });
});
