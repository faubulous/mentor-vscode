import { IToken, QuadContext } from '@faubulous/mentor-rdf-parsers';
import { Term } from '@rdfjs/types';
import { ResourceId } from '../form-editor-model';

/**
 * A range of the document covered by a run of tokens. Offsets are exclusive at the end.
 */
export interface TokenSpan {
	start: number;
	end: number;
	startTokenIndex: number;
	endTokenIndex: number;
}

/**
 * One item of a collection `( ... )`, located at the token of the item itself.
 */
export interface CollectionItemSpan extends TokenSpan {
	/** The `rdf:first` statement of the chain node holding the item. */
	quad: QuadContext;
	term: Term;
}

/**
 * One object of a predicate, covering the whole written term: a literal including its datatype
 * or language tag, a nested blank node up to its closing bracket, a collection up to its
 * closing parenthesis.
 */
export interface ObjectSpan extends TokenSpan {
	quad: QuadContext;
	/** The items when the object is written as a collection, in order. */
	items?: CollectionItemSpan[];
	/** The comment lines written between the token before the object and the object. */
	leadingComments: IToken[];
	/** The comment ending the line the object is written on. */
	trailingComment?: IToken;
}

/**
 * A predicate and the objects written after it, as one `predicate object, object` run.
 */
export interface PredicateGroup extends TokenSpan {
	predicateIri: string;
	predicateToken: IToken;
	objects: ObjectSpan[];
	/** The comment lines written between the token before the predicate and the predicate. */
	leadingComments: IToken[];
}

/**
 * The statements written about one subject in one place: a top level `subject ... .` block, or
 * the inside of an inline blank node `[ ... ]`.
 */
export interface SubjectBlock extends TokenSpan {
	subjectId: ResourceId;
	subject: Term;
	subjectToken: IToken;
	groups: PredicateGroup[];
	/** The comment lines written between the token before the subject and the subject. */
	leadingComments: IToken[];
	/** Whether the statements are written inside `[ ... ]` in object position. */
	nested: boolean;
	/** The `.` ending the block, or the `]` closing a nested block. Absent in a TriG graph block that omits the final period. */
	terminator?: IToken;
	/** Stray `;` tokens between the last object and the terminator. */
	trailingSemicolons: IToken[];
	/** The named graph the block is written in, for TriG documents. */
	graph?: string;
	/** The braces of the graph block enclosing this block, for TriG documents. */
	graphBlock?: { open: IToken; close: IToken };
}

/**
 * The token level structure of a document, built from its quad contexts. It is what the edit
 * synthesis navigates to find the text an operation touches.
 */
export interface StatementModel {
	text: string;
	tokens: IToken[];
	quadContexts: QuadContext[];
	blocks: SubjectBlock[];
	blocksBySubject: Map<ResourceId, SubjectBlock[]>;
	/** The items of every collection, by the identifier of its head node. */
	collections: Map<string, CollectionItemSpan[]>;
	/** The graph blocks of a TriG document, in document order. */
	graphBlocks: { open: IToken; close: IToken }[];
	/** The comments written after the last block, which close the document. */
	documentComments: IToken[];
}
