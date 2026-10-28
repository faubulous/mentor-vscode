import { describe, expect, it } from 'vitest';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { DOCUMENT_COMMENT_BLOCK_ID, buildFormBlocks } from './use-form-blocks';

const RESOURCES = [createResourceSummary('A', { comments: [['About the file'], ['Above A', 'second line']] }), createResourceSummary('B')];

describe('buildFormBlocks', () => {
	it('places each run of comments above a resource in a block of its own before its entry', () => {
		const blocks = buildFormBlocks(RESOURCES, [], false);

		expect(blocks.map(block => `${block.kind}:${block.id}`)).toEqual([`comment:comment:${RESOURCES[0].id}:0`, `comment:comment:${RESOURCES[0].id}:1`, `resource:${RESOURCES[0].id}`, `resource:${RESOURCES[1].id}`]);
		expect(blocks[1]).toMatchObject({ text: 'Above A\nsecond line', anchor: { kind: 'resource', resourceId: RESOURCES[0].id, subject: RESOURCES[0].term, run: 1 } });
	});

	it('closes the document with its trailing comments, each run named by its first line', () => {
		const blocks = buildFormBlocks(RESOURCES, [['The end', 'really'], ['Postscript']], false);

		expect(blocks.slice(-2)).toEqual([
			{ kind: 'comment', id: `${DOCUMENT_COMMENT_BLOCK_ID}:0`, text: 'The end\nreally', anchor: { kind: 'document', index: 0 } },
			{ kind: 'comment', id: `${DOCUMENT_COMMENT_BLOCK_ID}:1`, text: 'Postscript', anchor: { kind: 'document', index: 2 } }
		]);
	});

	it('hides every comment while filtering', () => {
		expect(buildFormBlocks(RESOURCES, [['The end']], true).map(block => block.kind)).toEqual(['resource', 'resource']);
	});
});
