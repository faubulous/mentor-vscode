import { IToken, QuadContext, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { isTokenOfType, nextNonCommentTokenIndex, tokenEnd } from '@src/utilities/tokens';
import { DocumentReader } from './document-reader';
import { EditRejectionError } from './edit-rejection';
import { PredicateGroup } from './statement-model';
import { CLOSING_TOKEN_NAMES } from './statement-model-builder';
import { SynthesisContext } from './synthesis-context';
import { TermRef } from './term-ref';

/**
 * The subject written in place of a blank node that has no label to be written with.
 */
const SUBJECT_PLACEHOLDER = '<urn:mentor:form-editor:subject>';

/**
 * What one line of Turtle states about a subject.
 */
export interface ParsedStatement {
	/**
	 * The IRI of the predicate the line states.
	 */
	predicateIri: string;

	/**
	 * The objects as written, one per top level object, with their nested nodes and lists.
	 */
	objects: string[];

	/**
	 * The statements of the subject itself.
	 */
	subjectQuads: QuadContext[];

	/**
	 * Every statement the line states, those of nested nodes and lists included.
	 */
	quads: QuadContext[];
}

/**
 * A `[…]` placeholder in a statement text, standing for a blank node already written.
 */
export interface StatementHole {
	/**
	 * The offset the placeholder starts at.
	 */
	start: number;

	/**
	 * The offset the placeholder ends at, exclusive.
	 */
	end: number;
}

/**
 * Reads one statement written for a subject as a line of Turtle: a predicate with its objects,
 * without the subject and the final period. The `[…]` placeholders of such a line stand for the
 * blank nodes already written under the predicate, which the parser splices back in.
 */
export class StatementTextParser {
	/**
	 * Create a parser for one user action.
	 * @param _context The shared state of the action.
	 */
	constructor(private readonly _context: SynthesisContext) { }

	/**
	 * Find the `[…]` placeholders of a statement text: `[…]`, `[...]`, `[ ]` or `[]`, outside of
	 * string literals.
	 * @param text The statement text.
	 * @returns The placeholders, in order.
	 */
	static findHoles(text: string): StatementHole[] {
		const holes: StatementHole[] = [];
		let index = 0;

		while (index < text.length) {
			const character = text[index];

			if (character === '"' || character === "'") {
				index = StatementTextParser._skipString(text, index);
				continue;
			}

			const hole = character === '[' ? StatementTextParser._holeAt(text, index) : undefined;

			if (hole) {
				holes.push(hole);
				index = hole.end;
			} else {
				index++;
			}
		}

		return holes;
	}

	/**
	 * Parse one statement written for a subject: a predicate with its objects, without the subject
	 * and the final period. The text is read as a document of its own, with the prefixes the action
	 * knows, so what it states can be compared with the document.
	 * @param subject The subject the statement is about.
	 * @param text The statement text.
	 * @returns What the text states.
	 * @throws {EditRejectionError} If the text does not parse, or states more or less than one predicate of the subject.
	 */
	parse(subject: TermRef, text: string): ParsedStatement {
		const context = this._context;

		const header = this._prefixDeclarations();
		const document = `${header}${this._writeSubject(subject)} ${text.trim()} .${context.style.eol}`;
		const read = new DocumentReader(context.input.syntax).read(document);

		if (!read.ok) {
			throw new EditRejectionError('invalidTerm', read.message);
		}

		const subjectQuads = read.quadContexts.filter(quad => quad.subjectToken.startOffset === header.length);
		const predicates = new Set(subjectQuads.map(quad => quad.predicate.value));

		if (predicates.size !== 1) {
			throw new EditRejectionError('invalidTerm', 'The line must state one predicate with its values.');
		}

		return {
			predicateIri: subjectQuads[0].predicate.value,
			objects: this._objectTexts(document, read.tokens, header.length),
			subjectQuads,
			quads: read.quadContexts
		};
	}

	/**
	 * Replace the placeholders of a statement text with the blank nodes written under a predicate:
	 * the i-th placeholder stands for the i-th object written as `[ ... ]`, items of collections
	 * included, and receives its source text unchanged. A text without placeholders drops every
	 * blank node; one that keeps some but not all of them cannot tell which went, and is refused.
	 * @param text The statement text with placeholders.
	 * @param group The group whose blank nodes the placeholders stand for.
	 * @returns The statement text with the blank nodes written out.
	 * @throws {EditRejectionError} If the placeholders do not match the blank nodes of the group.
	 */
	spliceHoles(text: string, group: PredicateGroup): string {
		const holes = StatementTextParser.findHoles(text);
		const sources = this._blankNodeSources(group);

		if (holes.length > sources.length) {
			throw new EditRejectionError('invalidTerm', `The line names ${holes.length} nested nodes, but the statement holds ${sources.length}.`);
		}

		if (holes.length > 0 && holes.length < sources.length) {
			throw new EditRejectionError('invalidTerm', 'Remove a nested node through its value, so it is clear which one goes.');
		}

		let result = '';
		let cursor = 0;

		holes.forEach((hole, index) => {
			result += text.slice(cursor, hole.start) + sources[index];
			cursor = hole.end;
		});

		return result + text.slice(cursor);
	}

	/**
	 * The prefix declarations the statement may use, when the syntax has prefixes.
	 * @returns The declarations as Turtle, or an empty string.
	 */
	private _prefixDeclarations(): string {
		const context = this._context;

		if (!context.writer.abbreviates) {
			return '';
		}

		return Object.entries(context.namespaces)
			.map(([prefix, iri]) => `@prefix ${prefix}: <${iri}> .${context.style.eol}`)
			.join('');
	}

	/**
	 * Write the subject the statement is parsed with. A blank node without a label is stood in for
	 * by a placeholder, as the subject only serves to locate the statement.
	 * @param subject The subject in wire form.
	 * @returns The written subject.
	 * @throws {EditRejectionError} If the subject cannot be written.
	 */
	private _writeSubject(subject: TermRef): string {
		try {
			return this._context.writer.writeSubject(subject);
		} catch (error) {
			if (error instanceof EditRejectionError && subject.kind === 'bnode') {
				return SUBJECT_PLACEHOLDER;
			}

			throw error;
		}
	}

	/**
	 * Cut the written objects out of the parsed document: the text between the predicate and the
	 * final period, split at the commas outside of nested nodes and lists.
	 * @param document The parsed document.
	 * @param tokens The tokens of the document.
	 * @param subjectOffset The offset of the subject in the document.
	 * @returns The written objects in order.
	 * @throws {EditRejectionError} If the text goes on after the statement.
	 */
	private _objectTexts(document: string, tokens: IToken[], subjectOffset: number): string[] {
		const subjectIndex = tokens.findIndex(token => token.startOffset === subjectOffset);
		const predicateIndex = nextNonCommentTokenIndex(tokens, subjectIndex);
		const objects: string[] = [];
		let depth = 0;
		let segmentStart = tokenEnd(tokens[predicateIndex]);

		for (let index = predicateIndex + 1; index < tokens.length; index++) {
			const token = tokens[index];

			depth += StatementTextParser._depthChange(token);

			if (depth > 0) {
				continue;
			}

			if (isTokenOfType(token, RdfToken.COMMA.name, RdfToken.PERIOD.name)) {
				objects.push(document.slice(segmentStart, token.startOffset).trim());
				segmentStart = tokenEnd(token);
			}

			if (isTokenOfType(token, RdfToken.PERIOD.name)) {
				return StatementTextParser._requireLastToken(tokens, index, objects);
			}
		}

		return objects;
	}

	/**
	 * The objects of a statement, provided its period ends the text.
	 * @param tokens The tokens of the document.
	 * @param index The index of the period.
	 * @param objects The objects read so far.
	 * @returns The objects.
	 * @throws {EditRejectionError} If the period is not the last token.
	 */
	private static _requireLastToken(tokens: IToken[], index: number, objects: string[]): string[] {
		if (index !== tokens.length - 1) {
			throw new EditRejectionError('invalidTerm', 'The line must state one predicate with its values.');
		}

		return objects;
	}

	/**
	 * How a token changes the nesting depth: opening brackets go down a level, closing ones come up.
	 * @param token The token to inspect.
	 * @returns `1`, `-1` or `0`.
	 */
	private static _depthChange(token: IToken): number {
		const name = token.tokenType?.name ?? '';

		if (CLOSING_TOKEN_NAMES[name]) {
			return 1;
		}

		return Object.values(CLOSING_TOKEN_NAMES).includes(name) ? -1 : 0;
	}

	/**
	 * The source text of every blank node written under a predicate, in document order: the objects
	 * written as `[ ... ]` and the items of collections written so.
	 * @param group The group whose blank nodes to collect.
	 * @returns The source texts.
	 */
	private _blankNodeSources(group: PredicateGroup): string[] {
		const modelText = this._context.model.text;
		const sources: string[] = [];

		for (const object of group.objects) {
			if (StatementTextParser._isBracketed(object.quad.objectToken)) {
				sources.push(modelText.slice(object.start, object.end));
			}

			for (const item of object.items ?? []) {
				if (StatementTextParser._isBracketed(item.quad.objectToken)) {
					sources.push(modelText.slice(item.start, item.end));
				}
			}
		}

		return sources;
	}

	/**
	 * Indicate whether a token opens an inline blank node.
	 * @param token The token to inspect.
	 * @returns `true` for a `[`.
	 */
	private static _isBracketed(token: { tokenType?: { name: string } }): boolean {
		return token.tokenType?.name === RdfToken.LBRACKET.name;
	}

	/**
	 * Match a placeholder at an offset of the text.
	 * @param text The statement text.
	 * @param index The offset to match at.
	 * @returns The placeholder, or `undefined` when none starts there.
	 */
	private static _holeAt(text: string, index: number): StatementHole | undefined {
		const match = /^\[\s*(?:…|\.\.\.)?\s*\]/.exec(text.slice(index));

		return match ? { start: index, end: index + match[0].length } : undefined;
	}

	/**
	 * Skip a string literal starting at an offset, honouring escapes and long quotes.
	 * @returns The offset after the closing quote, or the text length for an unterminated literal.
	 * @param text The statement text.
	 * @param index The offset of the opening quote.
	 */
	private static _skipString(text: string, index: number): number {
		const quote = text[index];
		const long = text.startsWith(quote.repeat(3), index);
		const closing = long ? quote.repeat(3) : quote;
		let cursor = index + closing.length;

		while (cursor < text.length) {
			if (text[cursor] === '\\') {
				cursor += 2;
				continue;
			}

			if (text.startsWith(closing, cursor)) {
				return cursor + closing.length;
			}

			cursor++;
		}

		return text.length;
	}
}
