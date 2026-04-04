import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

import { TurtlePrefixCompletionProvider } from './turtle-prefix-completion-provider';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';

describe('TurtlePrefixCompletionProvider', () => {
    it('stores the onComplete callback', () => {
        const cb = (uri: string) => ` <${uri}>`;
        const provider = new TurtlePrefixCompletionProvider(cb);
        expect(provider.onComplete).toBe(cb);
    });

    it('onComplete produces the expected string', () => {
        const provider = new TurtlePrefixCompletionProvider((uri) => ` <${uri}> .`);
        expect(provider.onComplete('http://example.org/')).toBe(' <http://example.org/> .');
    });

    it('prefixTokenTypes contains the PREFIX token name', () => {
        const provider = new TurtlePrefixCompletionProvider(() => '');
        const types = (provider as any).prefixTokenTypes as Set<string>;
        expect(types.has(RdfToken.PREFIX.name)).toBe(true);
    });

    it('prefixTokenTypes contains the TTL_PREFIX token name', () => {
        const provider = new TurtlePrefixCompletionProvider(() => '');
        const types = (provider as any).prefixTokenTypes as Set<string>;
        expect(types.has(RdfToken.TTL_PREFIX.name)).toBe(true);
    });

    it('prefixTokenTypes contains exactly two entries', () => {
        const provider = new TurtlePrefixCompletionProvider(() => '');
        const types = (provider as any).prefixTokenTypes as Set<string>;
        expect(types.size).toBe(2);
    });

    it('does not add extra token types beyond PREFIX and TTL_PREFIX', () => {
        const provider = new TurtlePrefixCompletionProvider(() => '');
        const types = (provider as any).prefixTokenTypes as Set<string>;
        const expected = new Set([RdfToken.PREFIX.name, RdfToken.TTL_PREFIX.name]);
        expect(types).toEqual(expected);
    });
});
