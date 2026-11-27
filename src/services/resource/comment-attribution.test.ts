import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { IToken } from '@faubulous/mentor-rdf-parsers';
import { readTurtleQuadContexts } from '@src/utilities/mocks/factories';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { getCommentText } from '@src/utilities/tokens';
import { CommentAttribution, getCommentRunLines } from './comment-attribution';

const EX = 'http://example.org/';

/**
 * A document of the shapes the attribution meets, with every kind of comment.
 */
const DOCUMENT = `@prefix ex: <${EX}> .

# run one

# run two
ex:s # ends the subject line
    # above a
    ex:a 1 ,
        # above 2
        2 ;
    # above b
    ex:b # ends the b line
        # above x
        ex:x , # ends the x line
        # above y
        ex:y ;
    # above n
    ex:n [
        # inside n
        ex:p 1
    ] .

# closing one

# closing two
`;

/**
 * The attribution of the comments of the document.
 */
function attribution(text = DOCUMENT): { comments: CommentAttribution; offsetOf: (image: string) => number } {
	const quads = readTurtleQuadContexts(text);

	return {
		comments: new CommentAttribution(quads),
		offsetOf: image => quads.find(quad => quad.objectToken.image === image)!.objectToken.startOffset
	};
}

/**
 * The texts of comment tokens.
 */
function textsOf(tokens: readonly IToken[]): string[] {
	return tokens.map(getCommentText);
}

describe('CommentAttribution', () => {
	const s = RdfDataFactory.namedNode(`${EX}s`);

	it('gives the comments above the first statement of a resource to the resource, as its runs', () => {
		expect(getCommentRunLines(attribution().comments.resourceComments(s))).toEqual([[' run one'], [' run two'], [' above a']]);
	});

	it('gives a comment above a value in a list of values to that value', () => {
		const { comments, offsetOf } = attribution();

		expect(textsOf(comments.valueComments(s, `${EX}a`, offsetOf('2')))).toEqual(['above 2']);
		expect(textsOf(comments.valueComments(s, `${EX}b`, offsetOf('ex:x')))).toEqual(['above x']);
		expect(textsOf(comments.valueComments(s, `${EX}b`, offsetOf('ex:y')))).toEqual(['above y']);
	});

	it('gives a comment above a later predicate to its property, and not the comments of the values before it', () => {
		const { comments } = attribution();

		expect(textsOf(comments.propertyComments(s, `${EX}b`))).toEqual(['above b']);
	});

	it('gives a comment above a statement whose value is a blank node to that value, and those inside it to the node', () => {
		const { comments, offsetOf } = attribution();
		const node = readTurtleQuadContexts(DOCUMENT).find(quad => quad.predicate.value === `${EX}p`)!.subject as ReturnType<typeof RdfDataFactory.blankNode>;

		expect(comments.propertyComments(s, `${EX}n`)).toEqual([]);
		expect(textsOf(comments.valueComments(s, `${EX}n`, offsetOf('[')))).toEqual(['above n']);
		expect(textsOf(comments.resourceComments(node))).toEqual(['inside n']);
	});

	it('leaves the comments ending a line to that line, and gives those after the last statement to the document', () => {
		const { comments } = attribution();
		const all = [
			...comments.resourceComments(s),
			...comments.propertyComments(s, `${EX}a`),
			...comments.propertyComments(s, `${EX}b`),
			...comments.documentComments()
		].map(getCommentText);

		expect(all.some(text => text.startsWith('ends'))).toBe(false);
		expect(getCommentRunLines(comments.documentComments())).toEqual([[' closing one'], [' closing two']]);
	});

	it('names the first statement of a resource and of each of its properties', () => {
		const { comments } = attribution();

		expect(comments.firstStatementOf(s)?.predicate.value).toBe(`${EX}a`);
		expect(comments.firstStatementOfProperty(s, `${EX}b`)?.object.value).toBe(`${EX}x`);
		expect(comments.firstStatementOf(RdfDataFactory.namedNode(`${EX}unknown`))).toBeUndefined();
	});
});
