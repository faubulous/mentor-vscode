import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('tsyringe', () => ({
    container: {
        resolve: vi.fn(() => ({
            onDidChangeDocumentContext: vi.fn(() => ({ dispose: vi.fn() })),
        })),
    },
    injectable: () => (target: any) => target,
    inject: () => (_target: any, _key: any, _index: any) => {},
    singleton: () => (target: any) => target,
}));

import { TurtleAutoDefinePrefixProvider } from './turtle-auto-define-prefix-provider';

describe('TurtleAutoDefinePrefixProvider', () => {
    it('constructs without throwing', () => {
        expect(() => new TurtleAutoDefinePrefixProvider(['turtle'])).not.toThrow();
    });

    it('accepts an empty language list', () => {
        expect(() => new TurtleAutoDefinePrefixProvider([])).not.toThrow();
    });

    it('accepts multiple languages', () => {
        expect(() => new TurtleAutoDefinePrefixProvider(['turtle', 'trig', 'n3'])).not.toThrow();
    });

    it('dispose() does not throw', () => {
        const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
        expect(() => provider.dispose()).not.toThrow();
    });

    it('dispose() can be called multiple times without throwing', () => {
        const provider = new TurtleAutoDefinePrefixProvider(['turtle']);
        provider.dispose();
        expect(() => provider.dispose()).not.toThrow();
    });
});
