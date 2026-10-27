import { IToken, QuadContext } from '@faubulous/mentor-rdf-parsers';
import { Term } from '@rdfjs/types';
import { ResourceId } from './resource-id';

/**
 * A range of the document covered by a run of tokens. Offsets are exclusive at the end.
 */
export interface TokenSpan {
	/**
	 * The offset the span starts at.
	 */
	start: number;

	/**
	 * The offset the span ends at, exclusive.
	 */
	end: number;

	/**
	 * The index of the first token of the span.
	 */
	startTokenIndex: number;

	/**
	 * The index of the last token of the span.
	 */
	endTokenIndex: number;
}

/**
 * One item of a collection `( ... )`, located at the token of the item itself.
 */
export interface CollectionItemSpan extends TokenSpan {
	/**
	 * The `rdf:first` statement of the chain node holding the item.
	 */
	quad: QuadContext;

	/**
	 * The item.
	 */
	term: Term;
}

/**
 * One object of a predicate, covering the whole written term: a literal including its datatype
 * or language tag, a nested blank node up to its closing bracket, a collection up to its
 * closing parenthesis.
 */
export interface ObjectSpan extends TokenSpan {
	/**
	 * The statement the object belongs to.
	 */
	quad: QuadContext;

	/**
	 * The items when the object is written as a collection, in order.
	 */
	items?: CollectionItemSpan[];

	/**
	 * The comment lines written between the token before the object and the object.
	 */
	leadingComments: IToken[];

	/**
	 * The comment ending the line the object is written on.
	 */
	trailingComment?: IToken;
}

/**
 * A predicate and the objects written after it, as one `predicate object, object` run.
 */
export interface PredicateGroup extends TokenSpan {
	/**
	 * The IRI of the predicate.
	 */
	predicateIri: string;

	/**
	 * The token the predicate is written as.
	 */
	predicateToken: IToken;

	/**
	 * The objects written under the predicate, in document order.
	 */
	objects: ObjectSpan[];

	/**
	 * The comment lines written between the token before the predicate and the predicate.
	 */
	leadingComments: IToken[];
}

/**
 * The statements written about one subject in one place: a top level `subject ... .` block, or
 * the inside of an inline blank node `[ ... ]`.
 */
export interface SubjectBlock extends TokenSpan {
	/**
	 * The identifier of the subject.
	 */
	subjectId: ResourceId;

	/**
	 * The subject term.
	 */
	subject: Term;

	/**
	 * The token the subject is written as.
	 */
	subjectToken: IToken;

	/**
	 * The predicate groups of the block, in document order.
	 */
	groups: PredicateGroup[];

	/**
	 * The comment lines written between the token before the subject and the subject.
	 */
	leadingComments: IToken[];

	/**
	 * Whether the statements are written inside `[ ... ]` in object position.
	 */
	nested: boolean;

	/**
	 * The `.` ending the block, or the `]` closing a nested block. Absent in a TriG graph block that omits the final period.
	 */
	terminator?: IToken;

	/**
	 * Stray `;` tokens between the last object and the terminator.
	 */
	trailingSemicolons: IToken[];

	/**
	 * The named graph the block is written in, for TriG documents.
	 */
	graph?: string;

	/**
	 * The braces of the graph block enclosing this block, for TriG documents.
	 */
	graphBlock?: { open: IToken; close: IToken };
}

/**
 * The token level structure of a document, built from its quad contexts. It is what the edit
 * synthesis navigates to find the text an operation touches.
 */
export interface StatementModel {
	/**
	 * The text of the document.
	 */
	text: string;

	/**
	 * The tokens of the text.
	 */
	tokens: IToken[];

	/**
	 * The quad contexts read from the tokens.
	 */
	quadContexts: QuadContext[];

	/**
	 * The subject blocks, in document order.
	 */
	blocks: SubjectBlock[];

	/**
	 * The blocks of each subject, in document order.
	 */
	blocksBySubject: Map<ResourceId, SubjectBlock[]>;

	/**
	 * The items of every collection, by the identifier of its head node.
	 */
	collections: Map<string, CollectionItemSpan[]>;

	/**
	 * The graph blocks of a TriG document, in document order.
	 */
	graphBlocks: { open: IToken; close: IToken }[];

	/**
	 * The comments written after the last block, which close the document.
	 */
	documentComments: IToken[];
}
