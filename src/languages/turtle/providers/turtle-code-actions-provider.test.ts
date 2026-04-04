import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn(() => ({})) },
    injectable: () => (_target: any) => _target,
    inject: () => () => {},
    singleton: () => (_target: any) => _target,
}));

// The diagnostic utility imports vscode.DiagnosticSeverity; mock it here
vi.mock('@src/utilities/vscode/diagnostic', () => ({
    getPrefixesWithErrorCode: vi.fn(() => []),
}));

import { TurtleCodeActionsProvider } from './turtle-code-actions-provider';
import { CodeActionKind } from '@src/utilities/mocks/vscode';

describe('TurtleCodeActionsProvider', () => {
    describe('providedCodeActionKinds', () => {
        it('is a non-empty array', () => {
            expect(TurtleCodeActionsProvider.providedCodeActionKinds.length).toBeGreaterThan(0);
        });

        it('contains a QuickFix kind', () => {
            const kinds = TurtleCodeActionsProvider.providedCodeActionKinds;
            expect(kinds).toContainEqual(CodeActionKind.QuickFix);
        });

        it('contains a Refactor kind', () => {
            const kinds = TurtleCodeActionsProvider.providedCodeActionKinds;
            expect(kinds).toContainEqual(CodeActionKind.Refactor);
        });

        it('contains exactly two kinds', () => {
            expect(TurtleCodeActionsProvider.providedCodeActionKinds).toHaveLength(2);
        });
    });

    describe('constructor', () => {
        it('can be instantiated without throwing', () => {
            expect(() => new TurtleCodeActionsProvider()).not.toThrow();
        });
    });
});
