import { RDF } from '@faubulous/mentor-rdf';
import { IToken, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { getIriFromIriReference } from '@src/utilities/tokens';
import { getIriFromPrefixedName, PrefixMap } from '@src/utilities/prefixed-name';
import { TermSearchStatement, TermSearchTargetType } from '@src/services/vocabulary/term-search';

/**
 * What a completion at a place of a document searches for: the type of terms that fit there, and
 * the statement they are picked for, where it names its resource.
 */
export interface TermSearchTarget {
	/**
	 * The type of terms that fit the place.
	 */
	targetType: TermSearchTargetType;

	/**
	 * The statement the terms are picked for: its resource where it is named by an IRI, and for an
	 * object its predicate.
	 */
	statement?: TermSearchStatement;
}

/**
 * What a frame of the statement expects next: its subject, a predicate, an object, the datatype of
 * the literal before, or a separator after an object.
 */
type Expected = 'subject' | 'predicate' | 'object' | 'datatype' | 'separator';

/**
 * A level of the statement being read: the statement itself, a blank node property list in it, or
 * a collection, with what it read so far.
 */
interface Frame {
	/**
	 * Whether the frame is a collection, whose items are all objects.
	 */
	collection: boolean;

	/**
	 * The subject of the frame, where it is named by an IRI.
	 */
	subject?: string;

	/**
	 * The IRI of the predicate the frame reads the objects of.
	 */
	predicate?: string;

	/**
	 * What the frame expects next.
	 */
	expects: Expected;
}

/**
 * The names of the tokens the reading of a statement tells apart.
 */
interface TokenNames {
	/**
	 * The tokens that end a statement, after which a new one begins.
	 */
	statementEnds: ReadonlySet<string>;

	/**
	 * The tokens that begin a prefix or base declaration, which is no statement.
	 */
	directives: ReadonlySet<string>;

	/**
	 * The tokens that write a term of a statement.
	 */
	terms: ReadonlySet<string>;
}

let tokenNames: TokenNames | undefined;

/**
 * The names of the tokens the reading of a statement tells apart, made on first use rather than as
 * the module loads.
 * @returns The names.
 */
function _tokenNames(): TokenNames {
	return tokenNames ??= {
		statementEnds: new Set([RdfToken.PERIOD.name, RdfToken.LCURLY.name, RdfToken.RCURLY.name]),
		directives: new Set([RdfToken.PREFIX.name, RdfToken.TTL_PREFIX.name, RdfToken.BASE.name, RdfToken.TTL_BASE.name]),
		terms: new Set([
			RdfToken.IRIREF.name,
			RdfToken.IRIREF_ABS.name,
			RdfToken.PNAME_LN.name,
			RdfToken.PNAME_NS.name,
			RdfToken.A.name,
			RdfToken.BLANK_NODE_LABEL.name,
			RdfToken.ANON.name,
			RdfToken.VAR1.name,
			RdfToken.VAR2.name,
			RdfToken.STRING_LITERAL_QUOTE.name,
			RdfToken.STRING_LITERAL_SINGLE_QUOTE.name,
			RdfToken.STRING_LITERAL_LONG_QUOTE.name,
			RdfToken.STRING_LITERAL_LONG_SINGLE_QUOTE.name,
			RdfToken.INTEGER.name,
			RdfToken.DECIMAL.name,
			RdfToken.DOUBLE.name,
			RdfToken.TRUE.name,
			RdfToken.FALSE.name
		])
	};
}

/**
 * What a completion at a place of a Turtle, TriG or SPARQL document searches for, read from the
 * tokens of the statement before the place: a predicate after a subject or `;`; a class as the
 * object of `a` or `rdf:type`; a datatype after `^^`; a resource as any other object and as a
 * subject. The statement names the subject where it is an IRI, and for an object the predicate.
 * @param tokens The tokens of the document.
 * @param end The index of the first token at or after the place.
 * @param namespaces The prefixes the document declares.
 * @returns The target, or `undefined` where nothing is completed, as inside a prefix declaration.
 */
export function getTermSearchTarget(tokens: readonly IToken[], end: number, namespaces: PrefixMap): TermSearchTarget | undefined {
	const frames: Frame[] = [_statementFrame()];
	let directive = false;

	for (let index = _statementStart(tokens, end); index < end; index++) {
		const name = tokens[index].tokenType.name;

		if (_tokenNames().directives.has(name)) {
			directive = true;
		} else if (directive) {
			// A declaration ends with its IRI, and in Turtle with a period too.
			directive = name !== RdfToken.IRIREF.name && name !== RdfToken.IRIREF_ABS.name;
			frames.splice(0, frames.length, _statementFrame());
		} else {
			_read(frames, tokens[index], namespaces);
		}
	}

	return directive ? undefined : _targetOf(frames[frames.length - 1]);
}

/**
 * The index of the first token of the statement a place is in: the token after the end of the
 * statement before, or the first token of the document.
 * @param tokens The tokens of the document.
 * @param end The index of the first token at or after the place.
 * @returns The index.
 */
function _statementStart(tokens: readonly IToken[], end: number): number {
	for (let index = end - 1; index >= 0; index--) {
		if (_tokenNames().statementEnds.has(tokens[index].tokenType.name)) {
			return index + 1;
		}
	}

	return 0;
}

/**
 * A frame of a statement that expects its subject.
 * @returns The frame.
 */
function _statementFrame(): Frame {
	return { collection: false, expects: 'subject' };
}

/**
 * Read a token of the statement into its frames.
 * @param frames The frames, the innermost last.
 * @param token The token.
 * @param namespaces The prefixes the document declares.
 */
function _read(frames: Frame[], token: IToken, namespaces: PrefixMap): void {
	const frame = frames[frames.length - 1];
	const name = token.tokenType.name;

	switch (name) {
		case RdfToken.SEMICOLON.name:
			frame.predicate = undefined;
			frame.expects = 'predicate';
			return;
		case RdfToken.COMMA.name:
			frame.expects = 'object';
			return;
		case RdfToken.DCARET.name:
			frame.expects = 'datatype';
			return;
		case RdfToken.LBRACKET.name:
			frames.push({ collection: false, expects: 'predicate' });
			return;
		case RdfToken.LPARENT.name:
			frames.push({ collection: true, expects: 'object' });
			return;
		case RdfToken.RBRACKET.name:
		case RdfToken.RPARENT.name:
			_close(frames);
			return;
	}

	if (_tokenNames().terms.has(name)) {
		_readTerm(frame, token, namespaces);
	}
}

/**
 * Close the innermost blank node property list or collection: in the frame around it, it stands
 * as the subject or as an object.
 * @param frames The frames, the innermost last.
 */
function _close(frames: Frame[]): void {
	if (frames.length > 1) {
		frames.pop();
	}

	const frame = frames[frames.length - 1];

	frame.expects = frame.expects === 'subject' ? 'predicate' : frame.collection ? 'object' : 'separator';
}

/**
 * Read a term into a frame, by what the frame expects.
 * @param frame The frame.
 * @param token The token of the term.
 * @param namespaces The prefixes the document declares.
 */
function _readTerm(frame: Frame, token: IToken, namespaces: PrefixMap): void {
	switch (frame.expects) {
		case 'subject':
			frame.subject = _iriOf(token, namespaces);
			frame.expects = 'predicate';
			return;
		case 'predicate':
			frame.predicate = token.tokenType.name === RdfToken.A.name ? RDF.type : _iriOf(token, namespaces);
			frame.expects = 'object';
			return;
		default:
			// An object, or the datatype of the literal before; a collection takes more objects.
			frame.expects = frame.collection ? 'object' : 'separator';
	}
}

/**
 * What a completion searches for in a frame.
 * @param frame The innermost frame at the place.
 * @returns The target, or `undefined` where no term may follow, as right after an object.
 */
function _targetOf(frame: Frame): TermSearchTarget | undefined {
	const subject = frame.subject ? RdfDataFactory.namedNode(frame.subject) : undefined;

	switch (frame.expects) {
		case 'subject':
			return { targetType: 'resource' };
		case 'predicate':
			return { targetType: 'predicate', statement: subject ? { subject } : undefined };
		case 'datatype':
			return { targetType: 'datatype' };
		case 'object':
			return { targetType: frame.predicate === RDF.type ? 'class' : 'resource', statement: subject || frame.predicate ? { subject, predicate: frame.predicate } : undefined };
		default:
			return undefined;
	}
}

/**
 * The IRI a token names: a prefixed name by the prefixes of the document, or an `<iri>`.
 * @param token The token.
 * @param namespaces The prefixes the document declares.
 * @returns The IRI, or `undefined` for a blank node, a variable or a literal.
 */
function _iriOf(token: IToken, namespaces: PrefixMap): string | undefined {
	switch (token.tokenType.name) {
		case RdfToken.PNAME_LN.name:
		case RdfToken.PNAME_NS.name:
			return getIriFromPrefixedName(namespaces, token.image);
		case RdfToken.IRIREF.name:
		case RdfToken.IRIREF_ABS.name:
			return getIriFromIriReference(token.image);
		default:
			return undefined;
	}
}
