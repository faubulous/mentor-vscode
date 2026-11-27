import { useMemo } from 'react';
import { termToString } from 'rdf-string';
import { ResourceListItemData } from '../form-editor-model';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { FormBlock } from '../state/form-block';

/**
 * The prefix of the identifiers of the blocks holding the comments at the end of the document.
 */
export const DOCUMENT_COMMENT_BLOCK_ID = 'comment:document';

/**
 * The term the comments closing the document are written for, which no resource of it is.
 */
const DOCUMENT_SUBJECT = RdfDataFactory.namedNode('urn:mentor:document');

/**
 * Build the blocks of the form from the visible resources. While filtering, only the entries are
 * listed: a comment belongs to its place in the document, which a filtered list no longer shows.
 * @param resources The resources to list, in document order.
 * @param trailingComments The lines of each run of comments after the last resource of the document.
 * @param filtering Whether a filter narrows the list.
 * @returns The blocks, in document order.
 */
export function buildFormBlocks(resources: readonly ResourceListItemData[], trailingComments: readonly string[][], filtering: boolean): FormBlock[] {
	const blocks: FormBlock[] = [];

	for (const resource of resources) {
		if (!filtering) {
			(resource.comments ?? []).forEach((lines, run) => blocks.push(_resourceCommentBlock(resource, lines, run)));
		}

		blocks.push({ kind: 'resource', id: termToString(resource.subject), resource });
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
export function useFormBlocks(resources: readonly ResourceListItemData[], trailingComments: readonly string[][], filtering: boolean): FormBlock[] {
	return useMemo(() => buildFormBlocks(resources, trailingComments, filtering), [resources, trailingComments, filtering]);
}

/**
 * The block of one run of comments written above a resource.
 * @param resource The resource.
 * @param lines The lines of the run.
 * @param run The index of the run among the runs above the resource.
 * @returns The block.
 */
function _resourceCommentBlock(resource: ResourceListItemData, lines: string[], run: number): FormBlock {
	return { kind: 'comment', id: `comment:${termToString(resource.subject)}:${run}`, lines, anchor: { kind: 'resource', subject: resource.subject, run }, subject: resource.subject };
}

/**
 * The blocks of the runs of comments closing the document.
 * @param runs The lines of each run.
 * @returns The blocks.
 */
function _documentCommentBlocks(runs: readonly string[][]): FormBlock[] {
	return runs.map((lines, run) => ({ kind: 'comment', id: `${DOCUMENT_COMMENT_BLOCK_ID}:${run}`, lines, anchor: { kind: 'document', run }, subject: DOCUMENT_SUBJECT }));
}
