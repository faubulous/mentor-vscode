import { describe, expect, it } from 'vitest';
import { RDFS } from '@faubulous/mentor-rdf';
import { createTestLineVocabulary, LINE_TEST_NAMESPACES } from '@src/utilities/mocks/line-fixtures';
import { createIriView, createProperty, createSampleResourceDetail, createTestResourceDetail, TEST_SUBJECT, TEST_SUBJECT_ID } from '@src/utilities/mocks/statement-fixtures';
import { ResourceDetail } from '../form-editor-model';
import { DraftLines } from '../state/draft-lines';
import { LineOverrides } from '../state/line-overrides';
import { LineCommitPlanner } from './line-commit-planner';
import { LineSerializer } from './line-serializer';
import { StatementRowsBuilder } from './statement-rows-builder';

const planner = new LineCommitPlanner(createTestLineVocabulary());
const builder = new StatementRowsBuilder(new LineSerializer(LINE_TEST_NAMESPACES));

/**
 * Plan the commit of a text on a row of a detail.
 */
function plan(text: string, rowIndex: number, detail: ResourceDetail = createSampleResourceDetail(), drafts = DraftLines.NONE) {
	const rows = builder.build({ resourceId: TEST_SUBJECT_ID, detail, drafts, overrides: LineOverrides.NONE });

	return planner.plan({ text, row: rows[rowIndex], detail, subject: TEST_SUBJECT });
}

describe('LineCommitPlanner.plan', () => {
	it('does nothing for an unchanged line', () => {
		expect(plan('rdfs:subClassOf owl:Thing', 2)).toEqual({ kind: 'none' });
	});

	it('rewrites a changed statement over its predicate', () => {
		expect(plan('rdfs:subClassOf owl:Thing ex:Tree', 2)).toEqual({
			kind: 'edit',
			operations: [{ op: 'replaceStatement', subject: TEST_SUBJECT, predicate: RDFS.subClassOf, text: 'rdfs:subClassOf owl:Thing, ex:Tree' }],
			text: 'rdfs:subClassOf owl:Thing ex:Tree',
			predicate: RDFS.subClassOf,
			newNestedNode: false
		});
	});

	it('keeps the nested nodes of the statement in the text sent to the host', () => {
		const detail = createTestResourceDetail([createProperty('rdfs:subClassOf', [createIriView('owl:Thing'), { term: { kind: 'bnode', id: 'b1' }, editable: true }])]);

		expect(plan('rdfs:subClassOf ex:Tree', 0, detail)).toMatchObject({ operations: [{ op: 'replaceStatement', text: 'rdfs:subClassOf ex:Tree, […]' }] });
	});

	it('keeps the text and reports a line that is not a statement', () => {
		expect(plan('foo:bar "x"', 2)).toMatchObject({ kind: 'problem', text: 'foo:bar "x"', message: 'Unknown prefix "foo:"' });
		expect(plan('# a comment', 2)).toMatchObject({ kind: 'problem', text: '# a comment' });
	});

	it('removes an emptied statement, unless it is the only one', () => {
		expect(plan('', 2)).toEqual({ kind: 'edit', operations: [{ op: 'deleteProperty', subject: TEST_SUBJECT, predicate: RDFS.subClassOf }], text: '', predicate: RDFS.subClassOf, newNestedNode: false });
		expect(plan('rdfs:subClassOf', 2)).toMatchObject({ kind: 'edit', operations: [{ op: 'deleteProperty', predicate: RDFS.subClassOf }] });
		expect(plan('', 0, createTestResourceDetail([createProperty('rdfs:subClassOf', [createIriView('owl:Thing')])]))).toEqual({ kind: 'keep', text: '' });
	});

	it('writes a draft as a new statement, keeps a predicate alone and discards an empty draft', () => {
		const drafts = DraftLines.NONE.open();
		const written = plan('rdfs:comment "Big"', 3, createSampleResourceDetail(), drafts);

		expect(written).toMatchObject({ kind: 'edit', operations: [{ op: 'replaceStatement', subject: TEST_SUBJECT, text: 'rdfs:comment "Big"' }], predicate: RDFS.comment });
		expect(written).not.toMatchObject({ operations: [{ predicate: expect.anything() }] });
		expect(plan('rdfs:comment', 3, createSampleResourceDetail(), drafts)).toEqual({ kind: 'keep', text: 'rdfs:comment' });
		expect(plan('', 3, createSampleResourceDetail(), drafts)).toEqual({ kind: 'discard' });
	});

	it('writes a statement without its marker and asks for the new nested node', () => {
		expect(plan('rdfs:subClassOf owl:Thing []', 2)).toEqual({ kind: 'edit', operations: [], text: 'rdfs:subClassOf owl:Thing []', predicate: RDFS.subClassOf, newNestedNode: true });
		expect(plan('rdfs:subClassOf owl:Thing ex:Tree []', 2)).toMatchObject({ kind: 'edit', operations: [{ op: 'replaceStatement', text: 'rdfs:subClassOf owl:Thing, ex:Tree' }], newNestedNode: true });
		expect(plan('rdfs:subClassOf []', 2)).toEqual({ kind: 'edit', operations: [], text: 'rdfs:subClassOf []', predicate: RDFS.subClassOf, newNestedNode: true });
	});
});
