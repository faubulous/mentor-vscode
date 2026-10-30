import { describe, expect, it } from 'vitest';
import { RDFS } from '@faubulous/mentor-rdf';
import { createLiteralView, createProperty, createTestResourceDetail, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { StatementDraft } from './statement-draft';
import { StatementRowState } from './statement-row-state';

const stored = StatementDraft.fromProperty(withAnchors(createTestResourceDetail([createProperty('rdfs:label', [createLiteralView('Tree', 'en')])])).properties[0]);

describe('StatementRowState', () => {
	it('starts clean from the stored statement', () => {
		const state = StatementRowState.of(stored, 'rdfs:label');

		expect(state.dirty).toBe(false);
		expect(state.valuesChanged).toBe(false);
		expect(state.predicateText).toBe('rdfs:label');
	});

	it('tells typing apart from what is stored', () => {
		const state = StatementRowState.of(stored, 'rdfs:label');

		expect(state.withLiteralText(0, 'Oak').valuesChanged).toBe(true);
		expect(state.withPendingText('x').dirty).toBe(true);
		expect(state.withPendingText('x').valuesChanged).toBe(false);
		expect(state.withPredicate(RDFS.comment).dirty).toBe(true);
	});

	it('adds a typed value and empties the field for a new value', () => {
		const state = StatementRowState.of(stored, 'rdfs:label').withPendingText('x').withValueAppended({ kind: 'literal', value: 'x' });

		expect(state.pendingText).toBe('');
		expect(state.draft.values).toHaveLength(2);
		expect(state.withoutValue(1).valuesChanged).toBe(false);
	});

	it('shows a problem until the next thing is typed', () => {
		const problem = { kind: 'notAName' } as const;
		const state = StatementRowState.of(stored, 'rdfs:label').withProblem(problem);

		expect(state.problem).toBe(problem);
		expect(state.withPendingText('y').problem).toBeUndefined();
		expect(state.withPredicateText('ex:p').problem).toBeUndefined();
		expect(state.withLiteralText(0, 'Oak').problem).toBe(problem);
	});
});
