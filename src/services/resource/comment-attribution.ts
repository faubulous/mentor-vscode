import { IToken, QuadContext } from '@faubulous/mentor-rdf-parsers';
import { NamedNode, BlankNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { getCommentText, hasSourcePosition, splitCommentRuns } from '@src/utilities/tokens';
import { isCollectionChainPredicate } from './resource-index';

/**
 * A subject, predicate or object of a statement written in the document, which the comments above
 * it introduce.
 */
interface CommentTarget {
	/**
	 * The token of the term.
	 */
	token: IToken;

	/**
	 * Whether the term is the object of the statement, rather than its subject or predicate.
	 */
	isObject: boolean;

	/**
	 * The statement.
	 */
	quad: QuadContext;
}

/**
 * Gives each comment line of a document to what it is written about, by where it stands among the
 * terms of the statements: a comment introduces the term written after it, and one written on the
 * line of the term before it ends that line. So:
 * - the comments above the first statement of a resource are the resource's own: above its card,
 *   or for a blank node written inside another, at the head of its nested card;
 * - those above a later predicate are the property's, unless its value is a blank node, which
 *   takes them, as a shape introduces each of its property shapes;
 * - those above a value, or a later statement of the same predicate, are the value's;
 * - those after the last statement close the document;
 * - and a comment ending a line belongs to that line, which no card shows.
 * The form shows the comments and its edits write them by these rules alike.
 */
export class CommentAttribution {
	/**
	 * The comments of each resource, by the key of its term.
	 */
	private readonly _resources = new Map<string, IToken[]>();

	/**
	 * The comments of each property, by the keys of its subject and predicate.
	 */
	private readonly _properties = new Map<string, IToken[]>();

	/**
	 * The comments of each value, by the keys of its subject and predicate and its position.
	 */
	private readonly _values = new Map<string, IToken[]>();

	/**
	 * The comments closing the document.
	 */
	private readonly _document: IToken[] = [];

	/**
	 * The first statement of each resource, by the key of its term.
	 */
	private readonly _firstOfResource = new Map<string, QuadContext>();

	/**
	 * The first statement of each property, by the keys of its subject and predicate.
	 */
	private readonly _firstOfProperty = new Map<string, QuadContext>();

	/**
	 * Attribute the comments of a document.
	 * @param quadContexts The statements of the document, with the comments the reader gave them.
	 */
	constructor(quadContexts: readonly QuadContext[]) {
		this._collectFirstStatements(quadContexts);

		const targets = _targetsOf(quadContexts);

		for (const comment of _commentsOf(quadContexts)) {
			this._attribute(comment, targets);
		}
	}

	/**
	 * The comments of a resource: above its card, or at the head of its nested card.
	 * @param subject The resource.
	 * @returns The comment tokens, in order.
	 */
	resourceComments(subject: NamedNode | BlankNode): readonly IToken[] {
		return this._resources.get(termToString(subject)) ?? [];
	}

	/**
	 * The comments of a property of a resource.
	 * @param subject The resource.
	 * @param predicate The IRI of the predicate.
	 * @returns The comment tokens, in order.
	 */
	propertyComments(subject: NamedNode | BlankNode, predicate: string): readonly IToken[] {
		return this._properties.get(_propertyKey(subject, predicate)) ?? [];
	}

	/**
	 * The comments of a value of a property.
	 * @param subject The resource.
	 * @param predicate The IRI of the predicate.
	 * @param anchor The offset the value is written at.
	 * @returns The comment tokens, in order.
	 */
	valueComments(subject: NamedNode | BlankNode, predicate: string, anchor: number): readonly IToken[] {
		return this._values.get(_valueKey(subject, predicate, anchor)) ?? [];
	}

	/**
	 * The comments after the last statement, which close the document.
	 * @returns The comment tokens, in order.
	 */
	documentComments(): readonly IToken[] {
		return this._document;
	}

	/**
	 * The first statement of a resource, which its own comments stand above.
	 * @param subject The resource.
	 * @returns The statement, or `undefined` for a resource the document states nothing about.
	 */
	firstStatementOf(subject: NamedNode | BlankNode): QuadContext | undefined {
		return this._firstOfResource.get(termToString(subject));
	}

	/**
	 * The first statement of a property of a resource, which its comments stand above.
	 * @param subject The resource.
	 * @param predicate The IRI of the predicate.
	 * @returns The statement, or `undefined` where the resource does not have the property.
	 */
	firstStatementOfProperty(subject: NamedNode | BlankNode, predicate: string): QuadContext | undefined {
		return this._firstOfProperty.get(_propertyKey(subject, predicate));
	}

	/**
	 * Note the first statement of each resource, not counting those that chain a list, and of each
	 * of its properties.
	 * @param quadContexts The statements, in document order.
	 */
	private _collectFirstStatements(quadContexts: readonly QuadContext[]): void {
		for (const quad of quadContexts) {
			const subject = termToString(quad.subject);
			const known = this._firstOfResource.get(subject);

			if (!known || (isCollectionChainPredicate(known.predicate.value) && !isCollectionChainPredicate(quad.predicate.value))) {
				this._firstOfResource.set(subject, quad);
			}

			const property = _propertyKey(quad.subject as NamedNode | BlankNode, quad.predicate.value);

			if (!this._firstOfProperty.has(property)) {
				this._firstOfProperty.set(property, quad);
			}
		}
	}

	/**
	 * Give a comment to what it is written about.
	 * @param comment The comment.
	 * @param targets The terms of the statements, ordered by where they are written.
	 */
	private _attribute(comment: IToken, targets: readonly CommentTarget[]): void {
		const next = _nextTargetIndex(targets, comment.startOffset);
		const previous = next < 0 ? targets[targets.length - 1] : targets[next - 1];

		// A comment on the line of the term before it ends that line.
		if (previous && (previous.token.endLine ?? previous.token.startLine) === comment.startLine) {
			return;
		}

		if (next < 0) {
			this._document.push(comment);

			return;
		}

		const { map, key } = this._ownerOf(targets[next]);

		map.set(key, [...(map.get(key) ?? []), comment]);
	}

	/**
	 * What the comments above a term are about.
	 * @param target The term.
	 * @returns Where the comments are kept, and under which key.
	 */
	private _ownerOf(target: CommentTarget): { map: Map<string, IToken[]>; key: string } {
		const quad = target.quad;
		const subject = quad.subject as NamedNode | BlankNode;
		const value = { map: this._values, key: _valueKey(subject, quad.predicate.value, quad.objectToken.startOffset) };

		if (target.isObject) {
			return value;
		}

		if (this._firstOfResource.get(termToString(subject)) === quad) {
			return { map: this._resources, key: termToString(subject) };
		}

		if (quad.object.termType !== 'BlankNode' && this._firstOfProperty.get(_propertyKey(subject, quad.predicate.value)) === quad) {
			return { map: this._properties, key: _propertyKey(subject, quad.predicate.value) };
		}

		return value;
	}
}

/**
 * The text of comment lines, one entry per line.
 * @param comments The comment tokens.
 * @returns The lines, or `undefined` when there are none.
 */
export function getCommentTexts(comments: readonly IToken[]): string[] | undefined {
	return comments.length > 0 ? comments.map(getCommentText) : undefined;
}

/**
 * The text of comment lines as their runs, which blank lines or other content separate.
 * @param comments The comment tokens.
 * @returns The lines of each run.
 */
export function getCommentRunTexts(comments: readonly IToken[]): string[][] {
	return splitCommentRuns(comments).map(run => run.map(getCommentText));
}

/**
 * The comment lines of a document, each once, in order.
 * @param quadContexts The statements, with the comments the reader gave them.
 * @returns The comments.
 */
function _commentsOf(quadContexts: readonly QuadContext[]): IToken[] {
	const comments = new Map<number, IToken>();

	for (const quad of quadContexts) {
		for (const comment of quad.leadingComments ?? []) {
			comments.set(comment.startOffset, comment);
		}
	}

	return Array.from(comments.values()).sort((first, second) => first.startOffset - second.startOffset);
}

/**
 * The terms of the statements that comments can introduce, ordered by where they are written. A
 * blank node written inside another is the object of one statement and the subject of others; the
 * comments above it are about it as a value.
 * @param quadContexts The statements.
 * @returns The terms.
 */
function _targetsOf(quadContexts: readonly QuadContext[]): CommentTarget[] {
	const targets = new Map<number, CommentTarget>();

	const add = (token: IToken | undefined, isObject: boolean, quad: QuadContext): void => {
		if (!token || !hasSourcePosition(token)) {
			return;
		}

		const known = targets.get(token.startOffset);

		if (!known || (isObject && !known.isObject)) {
			targets.set(token.startOffset, { token, isObject, quad });
		}
	};

	for (const quad of quadContexts) {
		add(quad.subjectToken, false, quad);
		add(quad.predicateToken, false, quad);
		add(quad.objectToken, true, quad);
	}

	return Array.from(targets.values()).sort((first, second) => first.token.startOffset - second.token.startOffset);
}

/**
 * Find the first term written after an offset.
 * @param targets The terms, ordered by where they are written.
 * @param offset The offset.
 * @returns The index of the term, or `-1` when none is written after the offset.
 */
function _nextTargetIndex(targets: readonly CommentTarget[], offset: number): number {
	let low = 0;
	let high = targets.length;

	while (low < high) {
		const middle = (low + high) >> 1;

		if (targets[middle].token.startOffset > offset) {
			high = middle;
		} else {
			low = middle + 1;
		}
	}

	return low < targets.length ? low : -1;
}

/**
 * The key of a property of a resource.
 * @param subject The resource.
 * @param predicate The IRI of the predicate.
 * @returns The key.
 */
function _propertyKey(subject: NamedNode | BlankNode, predicate: string): string {
	return `${termToString(subject)} ${predicate}`;
}

/**
 * The key of a value of a property of a resource.
 * @param subject The resource.
 * @param predicate The IRI of the predicate.
 * @param anchor The offset the value is written at.
 * @returns The key.
 */
function _valueKey(subject: NamedNode | BlankNode, predicate: string, anchor: number): string {
	return `${_propertyKey(subject, predicate)} ${anchor}`;
}
