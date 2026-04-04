import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { SparqlQueryService } from './sparql-query-service';
import type { SparqlQueryExecutionState } from './sparql-query-state';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(documentIri: string, startTime = Date.now()): SparqlQueryExecutionState {
    return {
        id: crypto.randomUUID(),
        documentIri,
        startTime,
        queryType: 'SELECT' as any,
        status: 'complete' as any,
    } as SparqlQueryExecutionState;
}

function makeContext(initialHistory: SparqlQueryExecutionState[] = []) {
    const store = new Map<string, any>([
        ['mentor.sparql.queryHistory', initialHistory],
    ]);

    return {
        workspaceState: {
            get: <T>(key: string, defaultValue: T): T => (store.has(key) ? store.get(key) : defaultValue),
            update: vi.fn(async (key: string, value: any) => { store.set(key, value); }),
        },
        subscriptions: { push: vi.fn() },
    } as unknown as import('vscode').ExtensionContext;
}

function makeService(context = makeContext()) {
    return new SparqlQueryService(
        context,
        {} as any,    // credentialStorage (not used in history tests)
        {} as any,    // connectionService (not used in history tests)
        {} as any,    // resultSerializer (not used in history tests)
    );
}

// ---------------------------------------------------------------------------
// constructor
// ---------------------------------------------------------------------------
describe('SparqlQueryService – constructor', () => {
    it('constructs without throwing', () => {
        expect(() => makeService()).not.toThrow();
    });

    it('initialises with an empty history when workspaceState is empty', () => {
        const service = makeService();
        expect(service.getQueryHistory()).toEqual([]);
    });

    it('restores persisted history from workspaceState', () => {
        const state = makeState('file:///workspace/query.sparql');
        const service = makeService(makeContext([state]));

        expect(service.getQueryHistory()).toHaveLength(1);
        expect(service.getQueryHistory()[0].documentIri).toBe('file:///workspace/query.sparql');
    });

    it('loads history sorted by startTime descending', () => {
        const older = makeState('file:///workspace/a.sparql', 1000);
        const newer = makeState('file:///workspace/b.sparql', 2000);
        const service = makeService(makeContext([older, newer]));

        const history = service.getQueryHistory();
        expect(history[0].documentIri).toBe('file:///workspace/b.sparql');
        expect(history[1].documentIri).toBe('file:///workspace/a.sparql');
    });

    it('loads at most 10 entries from workspaceState', () => {
        const entries = Array.from({ length: 15 }, (_, i) =>
            makeState(`file:///workspace/q${i}.sparql`, i),
        );
        const service = makeService(makeContext(entries));

        expect(service.getQueryHistory().length).toBeLessThanOrEqual(10);
    });
});

// ---------------------------------------------------------------------------
// getQueryHistory
// ---------------------------------------------------------------------------
describe('SparqlQueryService – getQueryHistory', () => {
    it('returns the same array reference on repeated calls', () => {
        const service = makeService();
        expect(service.getQueryHistory()).toBe(service.getQueryHistory());
    });
});

// ---------------------------------------------------------------------------
// getQueryStateForDocument
// ---------------------------------------------------------------------------
describe('SparqlQueryService – getQueryStateForDocument', () => {
    it('returns undefined for an unknown IRI', () => {
        const service = makeService();
        expect(service.getQueryStateForDocument('file:///workspace/missing.sparql')).toBeUndefined();
    });

    it('returns matching state for a known IRI', () => {
        const state = makeState('file:///workspace/known.sparql');
        const service = makeService(makeContext([state]));

        const result = service.getQueryStateForDocument(state.documentIri);
        expect(result).toBeDefined();
        expect(result!.documentIri).toBe(state.documentIri);
    });
});

// ---------------------------------------------------------------------------
// removeQueryStateAt
// ---------------------------------------------------------------------------
describe('SparqlQueryService – removeQueryStateAt', () => {
    it('returns false for a negative index', () => {
        const state = makeState('file:///workspace/q.sparql');
        const service = makeService(makeContext([state]));

        expect(service.removeQueryStateAt(-1)).toBe(false);
    });

    it('returns false for an out-of-bounds index', () => {
        const state = makeState('file:///workspace/q.sparql');
        const service = makeService(makeContext([state]));

        expect(service.removeQueryStateAt(5)).toBe(false);
    });

    it('returns true and removes the item at a valid index', () => {
        const s1 = makeState('file:///workspace/a.sparql', 1000);
        const s2 = makeState('file:///workspace/b.sparql', 2000);
        const service = makeService(makeContext([s1, s2]));

        // After sorting by startTime desc, index 0 is s2
        const removed = service.removeQueryStateAt(0);
        expect(removed).toBe(true);
        expect(service.getQueryHistory()).toHaveLength(1);
    });

    it('fires the onDidHistoryChange event after removal', () => {
        const state = makeState('file:///workspace/q.sparql');
        const service = makeService(makeContext([state]));

        const listener = vi.fn();
        service.onDidHistoryChange(listener);

        service.removeQueryStateAt(0);
        expect(listener).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// removeQueryState
// ---------------------------------------------------------------------------
describe('SparqlQueryService – removeQueryState', () => {
    it('removes a state found by reference', () => {
        const state = makeState('file:///workspace/q.sparql');
        const service = makeService(makeContext([state]));

        const ref = service.getQueryHistory()[0];
        service.removeQueryState(ref);

        expect(service.getQueryHistory()).toHaveLength(0);
    });

    it('does nothing when the state is not in the history', () => {
        const state = makeState('file:///workspace/q.sparql');
        const service = makeService(makeContext([state]));

        const phantom = makeState('file:///workspace/other.sparql');
        service.removeQueryState(phantom);

        expect(service.getQueryHistory()).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// cancelQuery
// ---------------------------------------------------------------------------
describe('SparqlQueryService – cancelQuery', () => {
    it('returns false for an unknown query ID', () => {
        const service = makeService();
        expect(service.cancelQuery('no-such-id')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// clearQueryHistory
// ---------------------------------------------------------------------------
describe('SparqlQueryService – clearQueryHistory', () => {
    it('clears all history entries', () => {
        const s1 = makeState('file:///workspace/a.sparql');
        const s2 = makeState('file:///workspace/b.sparql');
        const service = makeService(makeContext([s1, s2]));

        service.clearQueryHistory();

        expect(service.getQueryHistory()).toHaveLength(0);
    });

    it('persists an empty history to workspaceState', async () => {
        const ctx = makeContext([makeState('file:///workspace/a.sparql')]);
        const service = makeService(ctx);

        service.clearQueryHistory();

        // _persistQueryHistory calls workspaceState.update asynchronously
        await vi.waitFor(() => {
            expect(ctx.workspaceState.update).toHaveBeenCalled();
        });
    });
});
