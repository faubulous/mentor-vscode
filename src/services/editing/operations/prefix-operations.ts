import { IToken, RdfToken, isUpperCaseToken } from '@faubulous/mentor-rdf-parsers';
import { getContentStartOffset } from '@src/utilities/triplate';
import { PrefixDeclarationKeyword, getPrefixDeclaration, isValidPrefix } from '@src/utilities/prefixed-name';
import { nextNonCommentTokenIndex, tokenEnd } from '@src/utilities/tokens';
import { TextEditSpec } from '@src/utilities/text-edits';
import { EditOperation } from '../edit-operation';
import { EditPlan, createPlan } from '../edit-plan';
import { EditRejectionError } from '../edit-rejection';
import { SynthesisContext } from '../synthesis-context';
import { validateIri } from '../term-validation';

/**
 * The `declarePrefix` operation of the edit contract.
 */
export type DeclarePrefixOperation = Extract<EditOperation, { op: 'declarePrefix' }>;

/**
 * The keyword a document without prefix declarations gets, as the prefix definition service writes it.
 */
const DEFAULT_KEYWORD: PrefixDeclarationKeyword = 'PREFIX';

/**
 * A prefix declaration written in the document.
 */
interface WrittenDeclaration {
	/**
	 * The declared prefix, without the colon.
	 */
	prefix: string;

	/**
	 * The keyword the declaration starts with, in the case it is written in.
	 */
	keyword: PrefixDeclarationKeyword;

	/**
	 * The offset the declaration starts at.
	 */
	start: number;

	/**
	 * The offset the declaration ends at, exclusive.
	 */
	end: number;
}

/**
 * A declaration to insert and where it goes.
 */
interface Insertion {
	/**
	 * The offset the declaration is inserted at.
	 */
	offset: number;

	/**
	 * The declaration, without line breaks.
	 */
	declaration: string;

	/**
	 * The text written before and after the declarations inserted at the offset.
	 */
	frame: { before: string; after: string };
}

/**
 * Edits of the prefix declarations of a document.
 */
export class PrefixOperations {
	/**
	 * Create the operations of one user action.
	 * @param _context The shared state of the action.
	 */
	constructor(private readonly _context: SynthesisContext) { }

	/**
	 * Declare prefixes for namespaces, written like the declarations of the document: each on a
	 * line of its own after the last of them, or before the first that sorts after it where the
	 * settings keep them sorted and the document does. A document without declarations gets them
	 * at its start, below a frontmatter, followed by an empty line. The prefixes are added to the
	 * namespaces of the action, so the terms the other operations write use them.
	 * @param operations The operations.
	 * @returns The plan inserting the declarations, which changes no statement.
	 * @throws {EditRejectionError} If the syntax has no prefix declarations, a prefix or namespace is
	 * not valid, or the document or another operation declares the prefix for another namespace.
	 */
	declarePrefixes(operations: readonly DeclarePrefixOperation[]): EditPlan {
		const declarations = this._readDeclarations();
		const insertions: Insertion[] = [];

		for (const operation of operations) {
			if (this._declare(operation)) {
				insertions.push(this._insertionOf(declarations, operation));
			}
		}

		return createPlan({ edits: this._editsOf(insertions) });
	}

	/**
	 * Check an operation and add its prefix to the namespaces of the action.
	 * @param operation The operation.
	 * @returns `true` when the prefix is new, `false` when it is declared for the namespace already.
	 * @throws {EditRejectionError} If the prefix cannot be declared.
	 */
	private _declare(operation: DeclarePrefixOperation): boolean {
		const { prefix, namespace } = operation;
		const namespaces = this._context.namespaces;

		if (!this._context.writer.abbreviates) {
			throw new EditRejectionError({ kind: 'prefixesNotSupported' });
		}

		if (!isValidPrefix(prefix)) {
			throw new EditRejectionError({ kind: 'invalidPrefix', prefix });
		}

		validateIri(namespace);

		if (namespaces[prefix] === namespace) {
			return false;
		}

		if (namespaces[prefix] !== undefined) {
			throw new EditRejectionError({ kind: 'prefixTaken', prefix });
		}

		namespaces[prefix] = namespace;

		return true;
	}

	/**
	 * Where a declaration goes and how it is written.
	 * @param declarations The declarations written in the document.
	 * @param operation The operation.
	 * @returns The insertion.
	 */
	private _insertionOf(declarations: readonly WrittenDeclaration[], operation: DeclarePrefixOperation): Insertion {
		const text = this._context.input.text;
		const eol = this._context.style.eol;
		const next = this._sortedSuccessorOf(declarations, operation.prefix);
		const last = declarations[declarations.length - 1];

		if (next) {
			return { offset: next.start, declaration: getPrefixDeclaration(next.keyword, operation.prefix, operation.namespace), frame: { before: '', after: eol } };
		}

		if (last) {
			const lineEnd = text.indexOf('\n', last.end);
			const declaration = getPrefixDeclaration(last.keyword, operation.prefix, operation.namespace);

			return lineEnd < 0
				? { offset: text.length, declaration, frame: { before: eol, after: '' } }
				: { offset: lineEnd + 1, declaration, frame: { before: '', after: eol } };
		}

		const start = getContentStartOffset(text);
		const after = text.slice(start).trim() === '' ? eol : eol + eol;

		return { offset: start, declaration: getPrefixDeclaration(DEFAULT_KEYWORD, operation.prefix, operation.namespace), frame: { before: '', after } };
	}

	/**
	 * The declaration a new prefix is inserted before to keep the declarations sorted: the first that
	 * sorts after it, where the settings keep the declarations sorted, the document has them sorted,
	 * and each starts a line.
	 * @param declarations The declarations written in the document.
	 * @param prefix The new prefix.
	 * @returns The declaration, or `undefined` when the new one goes after the last.
	 */
	private _sortedSuccessorOf(declarations: readonly WrittenDeclaration[], prefix: string): WrittenDeclaration | undefined {
		const text = this._context.input.text;
		const sorted = declarations.every((declaration, index) => index === 0 || declarations[index - 1].prefix <= declaration.prefix);
		const startsLine = (offset: number): boolean => /^[ \t]*$/.test(text.slice(text.lastIndexOf('\n', offset - 1) + 1, offset));

		if (!this._context.input.style.sortPrefixes || !sorted) {
			return undefined;
		}

		const next = declarations.find(declaration => declaration.prefix > prefix);

		return next && startsLine(next.start) ? next : undefined;
	}

	/**
	 * The text edits of the insertions: one per offset, its declarations in the order given, each on
	 * a line of its own.
	 * @param insertions The insertions.
	 * @returns The edits.
	 */
	private _editsOf(insertions: readonly Insertion[]): TextEditSpec[] {
		const eol = this._context.style.eol;
		const byOffset = new Map<number, Insertion[]>();

		for (const insertion of insertions) {
			byOffset.set(insertion.offset, [...(byOffset.get(insertion.offset) ?? []), insertion]);
		}

		return Array.from(byOffset, ([offset, group]) => {
			const frame = group[0].frame;
			const lines = group.map(insertion => insertion.declaration).join(eol);

			return { start: offset, end: offset, newText: frame.before + lines + frame.after };
		});
	}

	/**
	 * Read the prefix declarations written in the document.
	 * @returns The declarations, in the order written.
	 */
	private _readDeclarations(): WrittenDeclaration[] {
		const tokens = this._context.input.tokens;
		const declarations: WrittenDeclaration[] = [];

		tokens.forEach((token, index) => {
			const declaration = this._readDeclaration(tokens, token, index);

			if (declaration) {
				declarations.push(declaration);
			}
		});

		return declarations;
	}

	/**
	 * Read the prefix declaration a token starts.
	 * @param tokens The tokens of the document.
	 * @param token The token.
	 * @param index The index of the token.
	 * @returns The declaration, or `undefined` when the token starts none.
	 */
	private _readDeclaration(tokens: readonly IToken[], token: IToken, index: number): WrittenDeclaration | undefined {
		const turtleForm = token.tokenType.name === RdfToken.TTL_PREFIX.name;

		if (!turtleForm && token.tokenType.name !== RdfToken.PREFIX.name) {
			return undefined;
		}

		const nameIndex = nextNonCommentTokenIndex(tokens, index);
		const iriIndex = nameIndex < 0 ? -1 : nextNonCommentTokenIndex(tokens, nameIndex);
		const endIndex = turtleForm && iriIndex >= 0 ? nextNonCommentTokenIndex(tokens, iriIndex) : iriIndex;

		if (endIndex < 0 || tokens[nameIndex].tokenType.name !== RdfToken.PNAME_NS.name) {
			return undefined;
		}

		const keyword: PrefixDeclarationKeyword = turtleForm ? '@prefix' : isUpperCaseToken(token) ? 'PREFIX' : 'prefix';

		return { prefix: tokens[nameIndex].image.slice(0, -1), keyword, start: token.startOffset, end: tokenEnd(tokens[endIndex]) };
	}
}
