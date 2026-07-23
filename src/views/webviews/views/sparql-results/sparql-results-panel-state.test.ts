import { describe, it, expect } from 'vitest';
import type { SparqlQueryExecutionState } from '@src/languages/sparql/services/sparql-query-state';
import {
	SparqlResultsPanelState,
	reduceOnHistory,
	reduceOnShowWelcome,
} from '@src/views/webviews/views/sparql-results/sparql-results-panel-state';

const INITIAL: SparqlResultsPanelState = { renderKey: 0, activeQueries: [], activeTabIndex: 0 };

function query(overrides: Partial<SparqlQueryExecutionState>): SparqlQueryExecutionState {
	return {
		id: 'q1',
		documentIri: 'file:///a.sparql',
		queryType: 'bindings',
		startTime: 0,
		...overrides,
	} as SparqlQueryExecutionState;
}

describe('reduceOnHistory', () => {
	it('adds and selects the tab when the select id and its query arrive together', () => {
		const q = query({ id: 'q1' });

		const next = reduceOnHistory(INITIAL, [q], 'q1');

		expect(next.activeQueries).toHaveLength(1);
		expect(next.activeTabIndex).toBe(1); // welcome is 0, first query tab is 1
		expect(next.pendingSelectQueryId).toBeUndefined();
	});

	it('remembers the select intent when the query is not in history yet, then selects it once it arrives', () => {
		// The mount pull carries the select id but the executing query is not logged yet.
		const afterPull = reduceOnHistory(INITIAL, [], 'q1');

		expect(afterPull.activeQueries).toHaveLength(0);
		expect(afterPull.activeTabIndex).toBe(0);
		expect(afterPull.pendingSelectQueryId).toBe('q1');

		// The execution push adds the query's tab (no explicit select id — the intent is carried).
		const afterPush = reduceOnHistory(afterPull, [query({ id: 'q1' })]);

		expect(afterPush.activeQueries).toHaveLength(1);
		expect(afterPush.activeTabIndex).toBe(1);
		expect(afterPush.pendingSelectQueryId).toBeUndefined();
	});

	it('does not change the active tab for a refresh with no select id', () => {
		// Two queries already open, welcome active.
		let state = reduceOnHistory(INITIAL, [query({ id: 'q1', documentIri: 'file:///a.sparql' })], 'q1');
		state = { ...state, activeTabIndex: 0 }; // user navigated back to welcome

		// A plain refresh (no select id) that re-reports q1 must not steal the selection.
		const next = reduceOnHistory(state, [query({ id: 'q1', documentIri: 'file:///a.sparql' })]);

		expect(next.activeTabIndex).toBe(0);
		expect(next.activeQueries).toHaveLength(1);
	});

	it('keeps selection on the welcome tab even when a query is (re)reported without a select id', () => {
		const next = reduceOnHistory(INITIAL, [query({ id: 'q1' })]);

		expect(next.activeQueries).toHaveLength(1);
		expect(next.activeTabIndex).toBe(0); // added, not selected
	});

	it('re-selects the query after a mid-sequence reset to welcome (mount race)', () => {
		// Execution selects the tab.
		let state = reduceOnHistory(INITIAL, [query({ id: 'q1' })], 'q1');
		expect(state.activeTabIndex).toBe(1);

		// A late mount reset drops back to welcome (index 0) — simulated directly.
		state = { ...state, activeTabIndex: 0 };

		// The end-of-execution push (still carrying the select id) re-selects it.
		const next = reduceOnHistory(state, [query({ id: 'q1' })], 'q1');
		expect(next.activeTabIndex).toBe(1);
	});

	it('ignores quads (CONSTRUCT/DESCRIBE) and void results (no panel tab)', () => {
		const quads = reduceOnHistory(INITIAL, [query({ id: 'q1', queryType: 'quads' })], 'q1');
		expect(quads.activeQueries).toHaveLength(0);
		// The intent is still remembered in case a subsequent bindings result matches it.
		expect(quads.pendingSelectQueryId).toBe('q1');
	});

	it('selects a generated query tab (documentIri match, isGenerated) like any bindings query', () => {
		const generated = query({ id: 'gen1', documentIri: 'mentor-template:/global/x.sparql', isGenerated: true });

		const next = reduceOnHistory(INITIAL, [generated], 'gen1');

		expect(next.activeQueries).toHaveLength(1);
		expect(next.activeTabIndex).toBe(1);
	});

	it('selects the tab when a background query is replaced by a doc execution (id rewritten by merge)', () => {
		// A background "List Graphs" tab whose documentIri was set when the user clicked Edit
		// (via UpdateQueryDocumentIri) — it still carries the background routing metadata.
		const existingTab = query({
			id: 'bg1',
			documentIri: 'untitled:Untitled-1',
			isBackground: false,
			label: 'List Graphs',
			connectionId: 'c1',
		});
		const state: SparqlResultsPanelState = { renderKey: 0, activeQueries: [existingTab], activeTabIndex: 0 };

		// The doc execution matches the tab by documentIri; the merge keeps the existing tab id
		// (bg1), but the controller's select id is the new doc query id — matched by the incoming id.
		const doc = query({ id: 'doc1', documentIri: 'untitled:Untitled-1', label: 'List Graphs', connectionId: 'c1' });
		const next = reduceOnHistory(state, [doc], 'doc1');

		expect(next.activeQueries).toHaveLength(1);
		expect(next.activeTabIndex).toBe(1);
		expect(next.activeQueries[0].id).toBe('bg1'); // routing metadata preserved
	});
});

describe('reduceOnShowWelcome', () => {
	it('forces the welcome tab and clears any pending selection', () => {
		const state: SparqlResultsPanelState = {
			renderKey: 3,
			activeQueries: [query({ id: 'q1' })],
			activeTabIndex: 1,
			pendingSelectQueryId: 'q2',
		};

		const next = reduceOnShowWelcome(state);

		expect(next.activeTabIndex).toBe(0);
		expect(next.pendingSelectQueryId).toBeUndefined();
		expect(next.activeQueries).toHaveLength(1); // tabs preserved
	});
});
