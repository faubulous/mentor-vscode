import { describe, expect, it } from 'vitest';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { EXAMPLE_NAMESPACE } from '@src/utilities/mocks/statement-fixtures';
import { DOCUMENT_COMMENT_BLOCK_ID, buildFormBlocks } from './use-form-blocks';

const RESOURCES = [createResourceSummary('A', { comments: [['About the file'], ['Above A', 'second line']] }), createResourceSummary('B')];

describe('buildFormBlocks', () => {
	it('places each run of comments above a resource in a block of its own before its entry', () => {
		const blocks = buildFormBlocks(RESOURCES, [], false);

		expect(blocks.map(block => `${block.kind}:${block.id}`)).toEqual([`comment:comment:${EXAMPLE_NAMESPACE}A:0`, `comment:comment:${EXAMPLE_NAMESPACE}A:1`, `resource:${EXAMPLE_NAMESPACE}A`, `resource:${EXAMPLE_NAMESPACE}B`]);
		expect(blocks[1]).toMatchObject({ text: 'Above A\nsecond line' });
	});

	it('closes the document with its trailing comments, a block per run', () => {
		const blocks = buildFormBlocks(RESOURCES, [['The end', 'really'], ['Postscript']], false);

		expect(blocks.slice(-2)).toEqual([
			{ kind: 'comment', id: `${DOCUMENT_COMMENT_BLOCK_ID}:0`, text: 'The end\nreally' },
			{ kind: 'comment', id: `${DOCUMENT_COMMENT_BLOCK_ID}:1`, text: 'Postscript' }
		]);
	});

	it('hides every comment while filtering', () => {
		expect(buildFormBlocks(RESOURCES, [['The end']], true).map(block => block.kind)).toEqual(['resource', 'resource']);
	});
});
