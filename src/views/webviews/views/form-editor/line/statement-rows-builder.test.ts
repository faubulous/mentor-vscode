import { describe, expect, it } from 'vitest';
import { OWL } from '@faubulous/mentor-rdf';
import { LINE_TEST_NAMESPACES } from '@src/utilities/mocks/line-fixtures';
import { createSampleResourceDetail, createTestResourceDetail, TEST_SUBJECT_ID } from '@src/utilities/mocks/statement-fixtures';
import { DraftLines } from '../state/draft-lines';
import { LineOverrides } from '../state/line-overrides';
import { LineSerializer } from './line-serializer';
import { StatementRowsBuilder, StatementRowsInput } from './statement-rows-builder';

const builder = new StatementRowsBuilder(new LineSerializer(LINE_TEST_NAMESPACES));

/**
 * Build the input for the sample detail with the given extras.
 */
function input(extra: Partial<StatementRowsInput> = {}): StatementRowsInput {
	return { resourceId: TEST_SUBJECT_ID, detail: createSampleResourceDetail(), drafts: DraftLines.NONE, overrides: LineOverrides.NONE, ...extra };
}

describe('StatementRowsBuilder.build', () => {
	it('lists the lines of the properties in document order with their models', () => {
		const rows = builder.build(input());

		expect(rows.map(row => row.line.text)).toEqual(['a owl:Class', 'rdfs:label "Tree"@en', 'rdfs:subClassOf owl:Thing']);
		expect(rows.map(row => row.source)).toEqual(['property', 'property', 'property']);
		expect(rows[0].line.key).toBe('i:tree|line|0||');
		expect(rows[0].line.model?.terms['owl:Class']?.term).toEqual({ kind: 'iri', iri: OWL.Class });
		expect(rows.every(row => row.line.editable)).toBe(true);
	});

	it('builds nothing for a resource without properties', () => {
		expect(builder.build(input({ detail: createTestResourceDetail([]) }))).toEqual([]);
	});

	it('places drafts after or before their rows, or at the end', () => {
		const drafts = DraftLines.NONE.open({ afterKey: 'i:tree|line|0||' }).open().open({ beforeKey: 'i:tree|line|2||' });
		const rows = builder.build(input({ drafts }));

		expect(rows.map(row => row.draftId)).toEqual([undefined, 1, undefined, 3, undefined, 2]);
		expect(rows[1].line.key).toBe(StatementRowsBuilder.draftLineKey(TEST_SUBJECT_ID, 1));
		expect(rows[1].line).toEqual({ key: 'i:tree|draft|1||', text: '', editable: true });
	});

	it('shows the committed text of a draft', () => {
		const drafts = DraftLines.NONE.open().committed(1, 'rdfs:comment "x"', 'http://www.w3.org/2000/01/rdf-schema#comment', false);

		expect(builder.build(input({ drafts }))[3].line.text).toBe('rdfs:comment "x"');
	});

	it('shows an override while the line reads as it did when committed', () => {
		const key = 'i:tree|line|2||';
		const overridden = builder.build(input({ overrides: LineOverrides.NONE.with(key, { original: 'rdfs:subClassOf owl:Thing', text: 'rdfs:subClassOf ex:Graph' }) }));
		const stale = builder.build(input({ overrides: LineOverrides.NONE.with(key, { original: 'rdfs:subClassOf ex:Tree', text: 'rdfs:subClassOf ex:Graph' }) }));

		expect(overridden[2].line.text).toBe('rdfs:subClassOf ex:Graph');
		expect(stale[2].line.text).toBe('rdfs:subClassOf owl:Thing');
	});
});
