import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

import { TurtleCodeLensProvider } from './turtle-codelens-provider';

describe('TurtleCodeLensProvider', () => {
    describe('constructor', () => {
        it('can be instantiated without throwing', () => {
            expect(() => new TurtleCodeLensProvider()).not.toThrow();
        });
    });

    describe('initial state', () => {
        it('_enabled is true by default', () => {
            const provider = new TurtleCodeLensProvider();
            expect((provider as any)._enabled).toBe(true);
        });

        it('_initialized is false before provideCodeLenses is called', () => {
            const provider = new TurtleCodeLensProvider();
            expect((provider as any)._initialized).toBe(false);
        });

        it('_initializing is false before provideCodeLenses is called', () => {
            const provider = new TurtleCodeLensProvider();
            expect((provider as any)._initializing).toBe(false);
        });

        it('exposes onDidChangeCodeLenses as an event', () => {
            const provider = new TurtleCodeLensProvider();
            expect(typeof provider.onDidChangeCodeLenses).toBe('function');
        });
    });
});
