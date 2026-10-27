import { IToken, RdfToken, isUpperCaseToken } from '@faubulous/mentor-rdf-parsers';
import { EditOperation } from '../edit-operation';
import { EditPlan, createPlan } from '../edit-plan';
import { EditRejectionError } from '../edit-rejection';
import { SynthesisContext } from '../synthesis-context';
import { validateIri, validatePrefix } from '../term-validation';
import { isTokenOfType, nextNonCommentTokenIndex, tokenEnd } from '@src/utilities/tokens';
import { lineStartOffset, nextLineStartOffset } from '@src/utilities/string';

/**
 * The `addNamespace` operation of the edit contract.
 */
type AddNamespaceOperation = Extract<EditOperation, { op: 'addNamespace' }>;

/**
 * A prefix declaration as written in the document.
 */
interface PrefixDeclaration {
	/**
	 * The `@prefix` or `PREFIX` keyword opening the declaration.
	 */
	keyword: IToken;

	/**
	 * The token naming the prefix, such as `ex:`.
	 */
	name: IToken;

	/**
	 * The namespace IRI.
	 */
	iri: IToken;

	/**
	 * The period closing an `@prefix` declaration.
	 */
	period?: IToken;

	/**
	 * The declared prefix.
	 */
	prefix: string;
}

/**
 * Declares namespaces.
 */
export class NamespaceOperations {
	/**
	 * Create the operations of one user action.
	 * @param _context The shared state of the action.
	 */
	constructor(private readonly _context: SynthesisContext) { }

	/**
	 * Declare a namespace prefix, written in the directive style the document already uses and, when
	 * the settings ask for it, in alphabetical order among the existing declarations.
	 * @param operation The namespace to declare.
	 * @returns The plan inserting the declaration, or an empty plan when it is declared already.
	 * @throws {EditRejectionError} If the syntax has no declarations, the prefix or IRI is not valid, or the prefix is declared for another namespace.
	 */
	addNamespace(operation: AddNamespaceOperation): EditPlan {
		const context = this._context;

		this._requireDirectives();
		validatePrefix(operation.prefix);
		validateIri(operation.iri);

		const existing = context.input.namespaces[operation.prefix];

		if (existing === operation.iri) {
			return createPlan({});
		}

		if (existing !== undefined) {
			throw new EditRejectionError('inUse', `The prefix '${operation.prefix}:' is already declared for another namespace.`);
		}

		const declarations = this._declarations();
		const text = this._declarationText(declarations, operation.prefix, operation.iri);
		const { eol } = context.style;
		const insertBefore = context.input.style.sortPrefixes
			? declarations.find(declaration => declaration.prefix.localeCompare(operation.prefix) > 0)
			: undefined;

		if (insertBefore) {
			const offset = lineStartOffset(context.model.text, insertBefore.keyword.startOffset);

			return createPlan({ edits: [{ start: offset, end: offset, newText: `${text}${eol}` }] });
		}

		const last = declarations[declarations.length - 1];

		if (last) {
			const offset = nextLineStartOffset(context.model.text, tokenEnd(last.period ?? last.iri));

			return createPlan({ edits: [{ start: offset, end: offset, newText: `${text}${eol}` }] });
		}

		const separator = context.model.text.trim().length === 0 ? '' : eol;

		return createPlan({ edits: [{ start: 0, end: 0, newText: `${text}${eol}${separator}` }] });
	}

	/**
	 * Collect the prefix declarations of the document in order.
	 * @returns The declarations in document order.
	 */
	private _declarations(): PrefixDeclaration[] {
		const context = this._context;

		const { tokens } = context.model;
		const declarations: PrefixDeclaration[] = [];

		tokens.forEach((token, index) => {
			if (!isTokenOfType(token, RdfToken.PREFIX.name, RdfToken.TTL_PREFIX.name)) {
				return;
			}

			const nameIndex = nextNonCommentTokenIndex(tokens, index);
			const iriIndex = nextNonCommentTokenIndex(tokens, nameIndex);
			const name = tokens[nameIndex];
			const iri = tokens[iriIndex];

			if (!isTokenOfType(name, RdfToken.PNAME_NS.name) || !isTokenOfType(iri, RdfToken.IRIREF.name)) {
				return;
			}

			const periodIndex = nextNonCommentTokenIndex(tokens, iriIndex);
			const period = token.tokenType.name === RdfToken.TTL_PREFIX.name && isTokenOfType(tokens[periodIndex], RdfToken.PERIOD.name) ? tokens[periodIndex] : undefined;

			declarations.push({ keyword: token, name, iri, period, prefix: name.image.slice(0, -1) });
		});

		return declarations;
	}

	/**
	 * Write a declaration in the style of the document: `@prefix` when the document uses only that,
	 * otherwise `PREFIX` in the case of the last declaration, which is also Mentor's default.
	 * @param declarations The declarations the document already has.
	 * @param prefix The prefix to declare.
	 * @param iri The namespace IRI.
	 * @returns The declaration text without a line break.
	 */
	private _declarationText(declarations: PrefixDeclaration[], prefix: string, iri: string): string {
		const turtleStyle = declarations.length > 0 && declarations.every(declaration => declaration.keyword.tokenType.name === RdfToken.TTL_PREFIX.name);

		if (turtleStyle) {
			return `@prefix ${prefix}: <${iri}> .`;
		}

		const last = declarations[declarations.length - 1];
		const upperCase = last ? isUpperCaseToken(last.keyword) : true;

		return `${upperCase ? 'PREFIX' : 'prefix'} ${prefix}: <${iri}>`;
	}

	/**
	 * Prefix declarations exist only in the syntaxes that abbreviate.
	 * @throws {EditRejectionError} If the syntax has no prefix declarations.
	 */
	private _requireDirectives(): void {
		const context = this._context;

		if (!context.writer.abbreviates) {
			throw new EditRejectionError('unsupportedSyntax', 'This syntax has no prefix declarations.');
		}
	}
}
