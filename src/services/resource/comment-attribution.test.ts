import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { IToken } from '@faubulous/mentor-rdf-parsers';
import { readTurtleDocument, readTurtleQuadContexts } from '@src/utilities/mocks/factories';
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
		expect(getCommentRunLines(attribution().comments.resourceComments(s))).toEqual([['run one'], ['run two'], ['above a']]);
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
		expect(getCommentRunLines(comments.documentComments())).toEqual([['closing one'], ['closing two']]);
	});

	it('names the first statement of a resource and of each of its properties', () => {
		const { comments } = attribution();

		expect(comments.firstStatementOf(s)?.predicate.value).toBe(`${EX}a`);
		expect(comments.firstStatementOfProperty(s, `${EX}b`)?.object.value).toBe(`${EX}x`);
		expect(comments.firstStatementOf(RdfDataFactory.namedNode(`${EX}unknown`))).toBeUndefined();
	});

	describe('with the tokens of the document', () => {
		const ENDS = `@prefix ex: <${EX}> .

ex:s ex:a 1 ;
    ex:n [
        ex:p 1
        # ends n
    ] ;
    ex:b 2 ;
    # ends s
    # really
.

# about t
ex:t ex:a 1 # ends the line
    # ends t
    .

# closing
`;

		/**
		 * The attribution of the comments of a document, with its tokens.
		 * @param text The document.
		 * @returns The attribution and the statements.
		 */
		function withTokens(text: string) {
			const read = readTurtleDocument(text);

			return { comments: new CommentAttribution(read.quadContexts, read.tokens), quads: read.quadContexts };
		}

		it('gives the comments before the . that closes the statements of a resource to its end', () => {
			const { comments } = withTokens(ENDS);
			const t = RdfDataFactory.namedNode(`${EX}t`);

			expect(textsOf(comments.endComments(s))).toEqual(['ends s', 'really']);
			expect(textsOf(comments.endComments(t))).toEqual(['ends t']);
			expect(textsOf(comments.resourceComments(t))).toEqual(['about t']);
			expect(textsOf(comments.documentComments())).toEqual(['closing']);
		});

		it('gives the comments before the ] that closes a blank node to the end of the node', () => {
			const { comments, quads } = withTokens(ENDS);
			const node = quads.find(quad => quad.predicate.value === `${EX}p`)!.subject as ReturnType<typeof RdfDataFactory.blankNode>;

			expect(textsOf(comments.endComments(node))).toEqual(['ends n']);
			expect(comments.propertyComments(s, `${EX}b`)).toEqual([]);
		});

		it('gives the comments before a . to what follows it without the tokens', () => {
			const comments = new CommentAttribution(readTurtleQuadContexts(ENDS));

			expect(comments.endComments(s)).toEqual([]);
			expect(textsOf(comments.resourceComments(RdfDataFactory.namedNode(`${EX}t`)))).toEqual(['ends s', 'really', 'about t']);
		});
	});
});
