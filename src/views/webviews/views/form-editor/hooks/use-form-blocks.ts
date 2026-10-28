import { useMemo } from 'react';
import { ResourceSummary } from '../form-editor-model';
import { FormBlock } from '../state/form-block';

/**
 * The prefix of the identifiers of the blocks holding the comments at the end of the document.
 */
export const DOCUMENT_COMMENT_BLOCK_ID = 'comment:document';

/**
 * Build the blocks of the form from the visible resources. While filtering, only the entries are
 * listed: a comment belongs to its place in the document, which a filtered list no longer shows.
 * @param resources The resources to list, in document order.
 * @param trailingComments The lines of each run of comments after the last resource of the document.
 * @param filtering Whether a filter narrows the list.
 * @returns The blocks, in document order.
 */
export function buildFormBlocks(resources: readonly ResourceSummary[], trailingComments: readonly string[][], filtering: boolean): FormBlock[] {
	const blocks: FormBlock[] = [];

	for (const resource of resources) {
		if (!filtering) {
			(resource.comments ?? []).forEach((lines, run) => blocks.push(_resourceCommentBlock(resource, lines, run)));
		}

		blocks.push({ kind: 'resource', id: resource.id, resource });
	}

	if (!filtering) {
		blocks.push(..._documentCommentBlocks(trailingComments));
	}

	return blocks;
}

/**
 * The blocks of the form, rebuilt when the resources, the closing comments or the filter change.
 * @param resources The resources to list, in document order.
 * @param trailingComments The lines of each run of comments after the last resource of the document.
 * @param filtering Whether a filter narrows the list.
 * @returns The blocks, in document order.
 */
export function useFormBlocks(resources: readonly ResourceSummary[], trailingComments: readonly string[][], filtering: boolean): FormBlock[] {
	return useMemo(() => buildFormBlocks(resources, trailingComments, filtering), [resources, trailingComments, filtering]);
}

/**
 * The block of one run of comments written above a resource.
 * @param resource The resource.
 * @param lines The lines of the run.
 * @param run The index of the run among the runs above the resource.
 * @returns The block.
 */
function _resourceCommentBlock(resource: ResourceSummary, lines: string[], run: number): FormBlock {
	return {
		kind: 'comment',
		id: `comment:${resource.id}:${run}`,
		text: lines.join('\n'),
		anchor: { kind: 'resource', resourceId: resource.id, subject: resource.term, run }
	};
}

/**
 * The blocks of the runs of comments closing the document, each named by its first line.
 * @param runs The lines of each run.
 * @returns The blocks.
 */
function _documentCommentBlocks(runs: readonly string[][]): FormBlock[] {
	let index = 0;

	return runs.map((lines, run) => {
		const block: FormBlock = { kind: 'comment', id: `${DOCUMENT_COMMENT_BLOCK_ID}:${run}`, text: lines.join('\n'), anchor: { kind: 'document', index } };

		index += lines.length;

		return block;
	});
}
