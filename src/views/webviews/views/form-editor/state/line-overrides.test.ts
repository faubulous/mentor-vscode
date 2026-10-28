import { describe, expect, it } from 'vitest';
import { LINE_TEST_NAMESPACES } from '@src/utilities/mocks/line-fixtures';
import { createSampleResourceDetail, TEST_SUBJECT_ID } from '@src/utilities/mocks/statement-fixtures';
import { LineSerializer } from '../line/line-serializer';
import { StatementRowsBuilder } from '../line/statement-rows-builder';
import { DraftLines } from './draft-lines';
import { LineOverrides } from './line-overrides';

const builder = new StatementRowsBuilder(new LineSerializer(LINE_TEST_NAMESPACES));
const KEY = 'i:tree|line|2||';

describe('LineOverrides', () => {
	it('sets and removes overrides without touching the original', () => {
		const overrides = LineOverrides.NONE.with(KEY, { original: 'a', text: 'b' });

		expect(overrides.get(KEY)).toEqual({ original: 'a', text: 'b' });
		expect(LineOverrides.NONE.get(KEY)).toBeUndefined();
		expect(overrides.without(KEY).get(KEY)).toBeUndefined();
		expect(overrides.without('other')).toBe(overrides);
	});

	it('keeps overrides that still apply and drops the rest', () => {
		const detail = createSampleResourceDetail();
		const rows = builder.build({ resourceId: TEST_SUBJECT_ID, detail, drafts: DraftLines.NONE, overrides: LineOverrides.NONE });
		const kept = LineOverrides.NONE.with(KEY, { original: 'rdfs:subClassOf owl:Thing', text: 'x' });

		expect(kept.prune(rows, detail)).toBe(kept);
		expect(kept.with('i:tree|line|0||', { original: 'rdf:type ex:Tree', text: 'y' }).with('gone', { original: '', text: '' }).prune(rows, detail)).toEqual(kept);
	});

	it('drops a submitted text once the host delivered the resource again, even when it reads as before, as after an undo', () => {
		const submitted = createSampleResourceDetail();
		const delivered = createSampleResourceDetail();
		const rows = builder.build({ resourceId: TEST_SUBJECT_ID, detail: delivered, drafts: DraftLines.NONE, overrides: LineOverrides.NONE });
		const overrides = LineOverrides.NONE.with(KEY, { original: 'rdfs:subClassOf owl:Thing', text: 'rdfs:subClassOf ex:Tree', submittedWith: submitted });

		expect(overrides.prune(rows, submitted)).toBe(overrides);
		expect(overrides.prune(rows, delivered)).toEqual(LineOverrides.NONE);
	});
});
