import { IToken, QuadContext, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { Term } from '@rdfjs/types';
import { RDF } from '@faubulous/mentor-rdf';
import { getResourceId } from './resource-id';
import { CollectionItemSpan, ObjectSpan, PredicateGroup, StatementModel, SubjectBlock } from './statement-model';
import { hasSourcePosition, isTriviaToken, nextNonTriviaIndex, previousNonTriviaIndex, tokenEnd } from '@src/utilities/tokens';

/**
 * The tokens that open a bracketed construct, with the token that closes each.
 */
export const CLOSING_TOKEN_NAMES: Record<string, string> = {
	[RdfToken.LBRACKET.name]: RdfToken.RBRACKET.name,
	[RdfToken.LPARENT.name]: RdfToken.RPARENT.name,
	[RdfToken.LCURLY.name]: RdfToken.RCURLY.name,
	[RdfToken.OPEN_TRIPLE_TERM.name]: RdfToken.CLOSE_TRIPLE_TERM.name,
	[RdfToken.OPEN_REIFIED_TRIPLE.name]: RdfToken.CLOSE_REIFIED_TRIPLE.name,
	[RdfToken.OPEN_ANNOTATION.name]: RdfToken.CLOSE_ANNOTATION.name
};

const STRING_TOKEN_NAMES = new Set([
	RdfToken.STRING_LITERAL_QUOTE.name,
	RdfToken.STRING_LITERAL_SINGLE_QUOTE.name,
	RdfToken.STRING_LITERAL_LONG_QUOTE.name,
	RdfToken.STRING_LITERAL_LONG_SINGLE_QUOTE.name
]);

/**
 * Builds the {@link StatementModel}. Statements are grouped by the identity of their subject and
 * predicate tokens, which the reader shares between the statements of one written block, so the
 * grouping follows the text rather than the graph.
 */
export class StatementModelBuilder {
	private readonly _tokenIndexByOffset = new Map<number, number>();

	private readonly _matchingClose = new Map<number, number>();

	private readonly _chainSubjectTokens = new Set<IToken>();

	private readonly _collections = new Map<string, CollectionItemSpan[]>();

	private readonly _graphBlocks: { open: IToken; close: IToken }[] = [];

	/**
	 * Create a builder for a document.
	 * @param _text The document text the tokens were read from.
	 * @param _tokens The token stream, including comment tokens.
	 * @param _quadContexts The quad contexts read from the tokens.
	 */
	constructor(
		private readonly _text: string,
		private readonly _tokens: IToken[],
		private readonly _quadContexts: QuadContext[]
	) {
		this._indexTokens();
		this._matchBrackets();
		this._collectChainSubjectTokens();
	}

	/**
	 * Build the model.
	 */
	build(): StatementModel {
		this._buildCollections();

		const blocks = this._buildBlocks();
		const blocksBySubject = new Map<string, SubjectBlock[]>();

		for (const block of blocks) {
			const list = blocksBySubject.get(block.subjectId) ?? [];

			list.push(block);
			blocksBySubject.set(block.subjectId, list);
		}

		return {
			text: this._text,
			tokens: this._tokens,
			quadContexts: this._quadContexts,
			blocks,
			blocksBySubject,
			collections: this._collections,
			graphBlocks: this._graphBlocks,
			documentComments: this._documentCommentsAfter(blocks)
		};
	}

	/**
	 * The comment tokens written after the last block, past its terminator.
	 */
	private _documentCommentsAfter(blocks: readonly SubjectBlock[]): IToken[] {
		const last = blocks[blocks.length - 1];

		if (!last) {
			return this._tokens.filter(isTriviaToken);
		}

		const end = last.terminator ? tokenEnd(last.terminator) : last.end;

		return this._tokens.filter(token => isTriviaToken(token) && token.startOffset >= end && !this._endsLineOf(token, end));
	}

	/**
	 * Indicate whether a comment token stands on the line that holds an offset, ending it.
	 */
	private _endsLineOf(token: IToken, offset: number): boolean {
		return !this._text.slice(offset, token.startOffset).includes('\n');
	}

	/**
	 * The comment lines written between the token before a token and the token itself. A comment
	 * that ends the line of the token before belongs to that line, not to what follows it.
	 */
	private _leadingCommentsBefore(tokenIndex: number): IToken[] {
		const previousIndex = previousNonTriviaIndex(this._tokens, tokenIndex);
		const previous = previousIndex >= 0 ? this._tokens[previousIndex] : undefined;

		return this._tokens
			.slice(previousIndex + 1, tokenIndex)
			.filter(comment => !previous || previous.endLine === undefined || comment.startLine !== previous.endLine);
	}

	/**
	 * Map token offsets to indices so a quad component can be located in the stream.
	 */
	private _indexTokens(): void {
		this._tokens.forEach((token, index) => this._tokenIndexByOffset.set(token.startOffset, index));
	}

	/**
	 * Pair every opening bracket with the token that closes it.
	 */
	private _matchBrackets(): void {
		const stack: number[] = [];

		this._tokens.forEach((token, index) => {
			const name = token.tokenType?.name;

			if (name && CLOSING_TOKEN_NAMES[name]) {
				stack.push(index);
			} else if (name && stack.length > 0 && CLOSING_TOKEN_NAMES[this._tokens[stack[stack.length - 1]].tokenType.name] === name) {
				const open = stack.pop()!;

				this._matchingClose.set(open, index);

				if (name === RdfToken.RCURLY.name) {
					this._graphBlocks.push({ open: this._tokens[open], close: token });
				}
			}
		});
	}

	/**
	 * Remember the subject tokens of collection chain nodes. The reader marks their `rdf:first`
	 * statements by using the item token as the predicate token, which a written statement
	 * never does.
	 */
	private _collectChainSubjectTokens(): void {
		for (const quad of this._quadContexts) {
			if (quad.predicate.value === RDF.first && quad.predicateToken === quad.objectToken && quad.subject.termType === 'BlankNode') {
				this._chainSubjectTokens.add(quad.subjectToken);
			}
		}
	}

	/**
	 * Indicate whether a quad is part of the chain that encodes a collection.
	 */
	private _isChainContext(quad: QuadContext): boolean {
		return (quad.predicate.value === RDF.first || quad.predicate.value === RDF.rest) && this._chainSubjectTokens.has(quad.subjectToken);
	}

	/**
	 * Collect the items of every collection by walking its chain from the head.
	 */
	private _buildCollections(): void {
		const firsts = new Map<string, QuadContext>();
		const rests = new Map<string, QuadContext>();

		for (const quad of this._quadContexts) {
			if (!this._isChainContext(quad)) {
				continue;
			}

			(quad.predicate.value === RDF.first ? firsts : rests).set(quad.subject.value, quad);
		}

		for (const first of firsts.values()) {
			if (first.subjectToken.tokenType?.name === RdfToken.LPARENT.name) {
				this._collections.set(first.subject.value, this._walkChain(first.subject.value, firsts, rests));
			}
		}
	}

	/**
	 * Follow a collection chain from its head and build the item spans in order.
	 */
	private _walkChain(headId: string, firsts: Map<string, QuadContext>, rests: Map<string, QuadContext>): CollectionItemSpan[] {
		const items: CollectionItemSpan[] = [];
		const visited = new Set<string>();
		let current: string | undefined = headId;

		while (current && !visited.has(current)) {
			visited.add(current);

			const first = firsts.get(current);

			if (!first) {
				break;
			}

			const span = this._toSpan(first.objectToken);

			if (span) {
				items.push({ ...span, quad: first, term: first.object });
			}

			const next: Term | undefined = rests.get(current)?.object;

			current = next?.termType === 'BlankNode' ? next.value : undefined;
		}

		return items;
	}

	/**
	 * Group the written statements into blocks and predicate groups.
	 */
	private _buildBlocks(): SubjectBlock[] {
		const blocks: SubjectBlock[] = [];
		const blocksByKey = new Map<string, SubjectBlock>();

		for (const quad of this._quadContexts) {
			if (this._isChainContext(quad) || !this._hasTokens(quad)) {
				continue;
			}

			const key = this._blockKey(quad);
			let block = blocksByKey.get(key);

			if (!block) {
				block = this._createBlock(quad, key.endsWith(':nested'));
				blocksByKey.set(key, block);
				blocks.push(block);
			}

			const lastGroup = block.groups[block.groups.length - 1];
			let group = lastGroup?.predicateToken === quad.predicateToken ? lastGroup : undefined;

			if (!group) {
				group = this._createGroup(quad);
				block.groups.push(group);
			}

			const span = this._toObjectSpan(quad);

			if (span) {
				group.objects.push(span);
			}
		}

		for (const block of blocks) {
			this._finalizeBlock(block);
		}

		return blocks.filter(block => block.groups.some(group => group.objects.length > 0));
	}

	/**
	 * Indicate whether every component of a quad is located in the token stream.
	 */
	private _hasTokens(quad: QuadContext): boolean {
		return [quad.subjectToken, quad.predicateToken, quad.objectToken].every(
			token => hasSourcePosition(token) && this._tokenIndexByOffset.has(token.startOffset)
		);
	}

	/**
	 * Build the key that tells the block a statement belongs to. The statements inside an inline
	 * blank node and those written after it share the `[` as their subject token, so the key
	 * records whether the predicate lies inside the brackets.
	 */
	private _blockKey(quad: QuadContext): string {
		return `${quad.subjectToken.startOffset}:${this._isInsideOwnBrackets(quad) ? 'nested' : 'top'}`;
	}

	/**
	 * Indicate whether a statement is written inside the brackets that open its blank node subject.
	 */
	private _isInsideOwnBrackets(quad: QuadContext): boolean {
		if (quad.subjectToken.tokenType?.name !== RdfToken.LBRACKET.name) {
			return false;
		}

		const openIndex = this._tokenIndexByOffset.get(quad.subjectToken.startOffset);
		const closeIndex = openIndex !== undefined ? this._matchingClose.get(openIndex) : undefined;

		return closeIndex !== undefined && quad.predicateToken.startOffset < this._tokens[closeIndex].startOffset;
	}

	/**
	 * Start a block for the subject of a statement.
	 */
	private _createBlock(quad: QuadContext, nested: boolean): SubjectBlock {
		const graph = quad.graph && quad.graph.termType !== 'DefaultGraph' ? quad.graph.value : undefined;

		const startTokenIndex = this._tokenIndexByOffset.get(quad.subjectToken.startOffset)!;

		return {
			subjectId: getResourceId(quad.subject),
			subject: quad.subject,
			subjectToken: quad.subjectToken,
			groups: [],
			leadingComments: nested ? [] : this._leadingCommentsBefore(startTokenIndex),
			nested,
			trailingSemicolons: [],
			graph,
			start: quad.subjectToken.startOffset,
			end: tokenEnd(quad.subjectToken),
			startTokenIndex,
			endTokenIndex: startTokenIndex
		};
	}

	/**
	 * Start a predicate group for the predicate of a statement.
	 */
	private _createGroup(quad: QuadContext): PredicateGroup {
		const index = this._tokenIndexByOffset.get(quad.predicateToken.startOffset)!;

		return {
			predicateIri: quad.predicate.value,
			predicateToken: quad.predicateToken,
			objects: [],
			leadingComments: this._leadingCommentsBefore(index),
			start: quad.predicateToken.startOffset,
			end: tokenEnd(quad.predicateToken),
			startTokenIndex: index,
			endTokenIndex: index
		};
	}

	/**
	 * Build the span of the object of a statement.
	 */
	private _toObjectSpan(quad: QuadContext): ObjectSpan | undefined {
		const span = this._toSpan(quad.objectToken);

		if (!span) {
			return undefined;
		}

		const items = quad.objectToken.tokenType?.name === RdfToken.LPARENT.name
			? this._collections.get(quad.object.value)
			: undefined;

		return { ...span, quad, items, leadingComments: this._leadingCommentsBefore(span.startTokenIndex), trailingComment: quad.trailingComment };
	}

	/**
	 * Build the span of a written term starting at a token: a literal with its datatype or
	 * language tag, or a bracketed construct up to its closing token.
	 */
	private _toSpan(token: IToken): { start: number; end: number; startTokenIndex: number; endTokenIndex: number } | undefined {
		const startTokenIndex = this._tokenIndexByOffset.get(token.startOffset);

		if (startTokenIndex === undefined) {
			return undefined;
		}

		const endTokenIndex = this._termEndIndex(startTokenIndex);

		return {
			start: token.startOffset,
			end: tokenEnd(this._tokens[endTokenIndex]),
			startTokenIndex,
			endTokenIndex
		};
	}

	/**
	 * Find the last token of the term that starts at a token.
	 */
	private _termEndIndex(index: number): number {
		const token = this._tokens[index];
		const name = token.tokenType?.name ?? '';

		if (STRING_TOKEN_NAMES.has(name)) {
			const next = nextNonTriviaIndex(this._tokens, index);
			const nextName = this._tokens[next]?.tokenType?.name;

			if (nextName === RdfToken.DCARET.name) {
				const datatype = nextNonTriviaIndex(this._tokens, next);

				return datatype >= 0 ? datatype : next;
			}

			return nextName === RdfToken.LANGTAG.name ? next : index;
		}

		if (CLOSING_TOKEN_NAMES[name]) {
			return this._matchingClose.get(index) ?? index;
		}

		return index;
	}

	/**
	 * Compute the extent, terminator and graph of a block once all its statements are known.
	 */
	private _finalizeBlock(block: SubjectBlock): void {
		for (const group of block.groups) {
			const last = group.objects[group.objects.length - 1];

			if (last) {
				group.end = last.end;
				group.endTokenIndex = last.endTokenIndex;
			}
		}

		const lastGroup = block.groups[block.groups.length - 1];

		if (lastGroup) {
			block.end = lastGroup.end;
			block.endTokenIndex = lastGroup.endTokenIndex;
		}

		if (block.nested) {
			const closeIndex = this._matchingClose.get(block.startTokenIndex);

			block.terminator = closeIndex !== undefined ? this._tokens[closeIndex] : undefined;
			block.trailingSemicolons = this._semicolonsBetween(block.endTokenIndex, closeIndex ?? block.endTokenIndex);
		} else {
			this._findTerminator(block);
		}

		block.graphBlock = this._graphBlocks.find(
			candidate => candidate.open.startOffset < block.start && block.start < candidate.close.startOffset
		);
	}

	/**
	 * Find the `.` that ends a top level block, noting stray semicolons before it.
	 */
	private _findTerminator(block: SubjectBlock): void {
		for (let i = block.endTokenIndex + 1; i < this._tokens.length; i++) {
			const token = this._tokens[i];

			if (isTriviaToken(token)) {
				continue;
			}

			if (token.tokenType?.name === RdfToken.SEMICOLON.name) {
				block.trailingSemicolons.push(token);
				continue;
			}

			if (token.tokenType?.name === RdfToken.PERIOD.name) {
				block.terminator = token;
			}

			return;
		}
	}

	/**
	 * Collect the semicolon tokens between two token indices.
	 */
	private _semicolonsBetween(from: number, to: number): IToken[] {
		return this._tokens
			.slice(from + 1, to)
			.filter(token => token.tokenType?.name === RdfToken.SEMICOLON.name);
	}
}
