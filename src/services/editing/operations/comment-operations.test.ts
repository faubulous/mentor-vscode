import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import { BlankNode } from '@rdfjs/types';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { EX, createSynthesisInput, synthesizeEdit } from '@src/utilities/mocks/edit-synthesis-fixtures';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { CommentAnchor } from '../comment-anchor';

const subject = RdfDataFactory.namedNode(`${EX}s`);

/**
 * The document the tests edit: two runs above the resource, the first written with `##`, values
 * on the line of their predicate and on lines of their own, a nested node and a closing comment.
 */
const BODY = `## kept as written
# old

# second run
ex:s ex:a 1 , 2 ;
    ex:b ex:x ,
        # above y
        ex:y ;
    ex:n [ ex:p 1 ] .

# closing
`;

/**
 * Write the lines of the comment at an anchor of a document.
 * @param at The anchor.
 * @param lines The lines.
 * @param body The statements of the document.
 * @returns The edited body, or the rejection.
 */
function setComment(at: CommentAnchor, lines: string[], body = BODY): string {
	return synthesizeEdit(body, [{ op: 'setComment', at, lines }]);
}

/**
 * The offset of the object written as a token image in the document.
 * @param image The image of the object.
 * @returns The offset.
 */
function offsetOf(image: string): number {
	return createSynthesisInput(BODY).quadContexts.find(quad => quad.objectToken.image === image)!.objectToken.startOffset;
}

/**
 * Replace the lines of the document between two lines with others.
 * @param from The first line replaced.
 * @param to The last line replaced.
 * @param lines The lines written instead.
 * @returns The document.
 */
function edited(from: string, to: string, lines: string[]): string {
	const all = BODY.split('\n');
	const start = all.indexOf(from);
	const end = all.indexOf(to, start);

	return [...all.slice(0, start), ...lines, ...all.slice(end + 1)].join('\n');
}

describe('CommentOperations.setComment', () => {
	it('rewrites a run above a resource, keeping how an unchanged line is written', () => {
		expect(setComment({ kind: 'resource', subject, run: 0 }, ['# kept as written', 'new'])).toBe(edited('## kept as written', '# old', ['## kept as written', '# new']));
	});

	it('writes each line after "# ", an empty one as # alone, and keeps an unchanged line as written', () => {
		expect(setComment({ kind: 'resource', subject, run: 0 }, ['text', ' spaced', '', '# heading'], '#nospace\nex:s ex:a 1 .\n')).toBe('# text\n#  spaced\n#\n# # heading\nex:s ex:a 1 .\n');
		expect(setComment({ kind: 'resource', subject, run: 0 }, ['nospace', 'more'], '#nospace\nex:s ex:a 1 .\n')).toBe('#nospace\n# more\nex:s ex:a 1 .\n');
	});

	it('removes a run, keeping the blank line that separates the run before it from the resource', () => {
		expect(setComment({ kind: 'resource', subject, run: 1 }, [])).toBe(edited('# second run', '# second run', []));
	});

	it('removes a run with a blank line beside it', () => {
		expect(setComment({ kind: 'document', run: 0 }, [])).toBe(BODY.replace('\n# closing\n', ''));
	});

	it('writes the first comment above a resource that has none', () => {
		expect(setComment({ kind: 'resource', subject, run: 0 }, ['first'], 'ex:s ex:a 1 .\n')).toBe('# first\nex:s ex:a 1 .\n');
	});

	it('writes a comment above a property, indented like the predicates', () => {
		expect(setComment({ kind: 'property', subject, predicate: `${EX}b` }, ['about b'])).toBe(edited('    ex:b ex:x ,', '    ex:b ex:x ,', ['    # about b', '    ex:b ex:x ,']));
	});

	it('moves a value written on the line of another onto a line of its own below its new comment', () => {
		expect(setComment({ kind: 'value', subject, predicate: `${EX}a`, anchor: offsetOf('2') }, ['about 2'])).toBe(edited('ex:s ex:a 1 , 2 ;', 'ex:s ex:a 1 , 2 ;', ['ex:s ex:a 1 ,', '        # about 2', '        2 ;']));
	});

	it('rewrites the comment above a value with several lines, and an empty line inside as an empty comment line', () => {
		expect(setComment({ kind: 'value', subject, predicate: `${EX}b`, anchor: offsetOf('ex:y') }, ['about y', '', 'more', '', ''])).toBe(edited('        # above y', '        # above y', ['        # about y', '        #', '        # more']));
	});

	it('writes a comment at the head of a node written inside another', () => {
		const node = createSynthesisInput(BODY).quadContexts.find(quad => quad.predicate.value === `${EX}p`)!.subject as BlankNode;

		expect(setComment({ kind: 'node', subject: node }, ['inside'])).toBe(edited('    ex:n [ ex:p 1 ] .', '    ex:n [ ex:p 1 ] .', ['    ex:n [', '        # inside', '        ex:p 1 ] .']));
	});

	it('writes the comment ending a resource before the . that closes it, on a line of its own', () => {
		expect(setComment({ kind: 'end', subject }, ['the end'])).toBe(edited('    ex:n [ ex:p 1 ] .', '    ex:n [ ex:p 1 ] .', ['    ex:n [ ex:p 1 ]', '    # the end', '.']));
		expect(setComment({ kind: 'end', subject }, ['the end'], 'ex:s ex:a 1 ;\n.\n')).toBe('ex:s ex:a 1 ;\n    # the end\n.\n');
	});

	it('writes the comment ending a node before the ] that closes it, which keeps the indentation of the line of its [', () => {
		const node = createSynthesisInput(BODY).quadContexts.find(quad => quad.predicate.value === `${EX}p`)!.subject as BlankNode;

		expect(setComment({ kind: 'end', subject: node }, ['ends n'])).toBe(edited('    ex:n [ ex:p 1 ] .', '    ex:n [ ex:p 1 ] .', ['    ex:n [ ex:p 1', '        # ends n', '    ] .']));
	});

	it('rewrites and removes the comment ending a resource', () => {
		const body = 'ex:s ex:a 1\n    # old end\n.\n';

		expect(setComment({ kind: 'end', subject }, ['new end'], body)).toBe('ex:s ex:a 1\n    # new end\n.\n');
		expect(setComment({ kind: 'end', subject }, [], body)).toBe('ex:s ex:a 1\n.\n');
	});

	it('rewrites a run closing the document', () => {
		expect(setComment({ kind: 'document', run: 0 }, ['the end'])).toBe(edited('# closing', '# closing', ['# the end']));
	});

	it('rejects an anchor that names nothing written', () => {
		expect(setComment({ kind: 'resource', subject, run: 5 }, ['x'])).toBe('rejected:commentGone');
		expect(setComment({ kind: 'value', subject, predicate: `${EX}a`, anchor: 1 }, ['x'])).toBe('rejected:commentGone');
		expect(setComment({ kind: 'property', subject, predicate: `${EX}unknown` }, ['x'])).toBe('rejected:commentGone');
	});

	it('rejects the comments of a document in a syntax whose comments the form does not read', () => {
		const body = `<${EX}s> <${EX}a> "1" .\n`;

		expect(synthesizeEdit(body, [{ op: 'setComment', at: { kind: 'resource', subject, run: 0 }, lines: ['x'] }], { syntax: RdfSyntax.NTriples })).toBe('rejected:commentsNotSupported');
	});
});

describe('CommentOperations.addComment', () => {
	it('writes a comment of its own at the end of the document', () => {
		expect(synthesizeEdit(BODY, [{ op: 'addComment', lines: ['appended'] }])).toBe(`${BODY}\n# appended\n`);
		expect(synthesizeEdit('ex:s ex:a 1 .', [{ op: 'addComment', lines: ['appended'] }])).toBe('ex:s ex:a 1 .\n\n# appended\n');
	});

	it('writes a comment of its own before a run above a resource, or directly above the resource, a blank line apart', () => {
		expect(synthesizeEdit(BODY, [{ op: 'addComment', before: { subject, run: 1 }, lines: ['free'] }])).toBe(edited('# second run', '# second run', ['# free', '', '# second run']));
		expect(synthesizeEdit(BODY, [{ op: 'addComment', before: { subject }, lines: ['free'] }])).toBe(edited('ex:s ex:a 1 , 2 ;', 'ex:s ex:a 1 , 2 ;', ['', '# free', '', 'ex:s ex:a 1 , 2 ;']));
	});

	it('writes nothing for a comment without lines, and rejects a run that is not written', () => {
		expect(synthesizeEdit(BODY, [{ op: 'addComment', lines: ['', ' '] }])).toBe(BODY);
		expect(synthesizeEdit(BODY, [{ op: 'addComment', before: { subject, run: 7 }, lines: ['free'] }])).toBe('rejected:commentGone');
	});
});
