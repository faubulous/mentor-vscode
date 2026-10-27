import { RdfToken } from '@faubulous/mentor-rdf-parsers';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { getIriFromIriReference, getIriFromPrefixedName } from '@src/utilities/tokens';
import { EditOperation } from '../edit-operation';
import { TermRef } from '../term-ref';
import { EditPlan, QuadExpectation, createPlan } from '../edit-plan';
import { EditRejectionError } from '../edit-rejection';
import { SubjectBlock } from '../statement-model';
import { ValueOperations } from './value-operations';
import { StatementLocator, ValueLocation } from '../statement-locator';
import { toTermRef } from '../resource-id';
import { expandToWholeLines } from '@src/utilities/text-edits';
import { SynthesisContext } from '../synthesis-context';
import { toPatternFromRef, toTermPattern } from '../term-patterns';
import { validateIri } from '../term-validation';
import { TextEditSpec } from '@src/utilities/text-edits';
import { isTokenOfType, previousNonCommentTokenIndex, tokenEnd } from '@src/utilities/tokens';
import { isBlank, isWhitespace, lineEndOffset, lineStartOffset, nextLineStartOffset } from '@src/utilities/string';

/**
 * The `addSubject` operation of the edit contract.
 */
type AddSubjectOperation = Extract<EditOperation, { op: 'addSubject' }>;

/**
 * The `deleteSubject` operation of the edit contract.
 */
type DeleteSubjectOperation = Extract<EditOperation, { op: 'deleteSubject' }>;

/**
 * The `renameSubject` operation of the edit contract.
 */
type RenameSubjectOperation = Extract<EditOperation, { op: 'renameSubject' }>;

/**
 * The `addNestedNode` operation of the edit contract.
 */
type AddNestedNodeOperation = Extract<EditOperation, { op: 'addNestedNode' }>;

/**
 * Where a block of text goes in the document: the range it replaces, the text put around it, and
 * the edits that make room for it elsewhere.
 */
export interface BlockInsertion {
	/**
	 * The offset the new block is inserted at.
	 */
	start: number;

	/**
	 * The offset the replaced text ends at, exclusive; equal to `start` for a pure insertion.
	 */
	end: number;

	/**
	 * The text written before the block, such as the blank line separating it from its neighbour.
	 */
	prefix: string;

	/**
	 * The text written after the block.
	 */
	suffix: string;

	/**
	 * Further edits the insertion needs, such as closing a graph block.
	 */
	extraEdits: TextEditSpec[];
}

/**
 * Take one blank line next to a removed block along, so two blocks do not end up separated by
 * two: the line after the block, or the line before it when the block ends the document.
 * @param text The document text.
 * @param range The whole lines being removed.
 * @returns The range widened by one blank line, or the range itself.
 */
export function absorbBlankLine(text: string, range: { start: number; end: number }): { start: number; end: number } {
	const lineEnd = lineEndOffset(text, range.end);

	if (range.end < text.length && isBlank(text, range.end, lineEnd) && lineEnd < text.length) {
		return { start: range.start, end: nextLineStartOffset(text, range.end) };
	}

	if (range.end >= text.length && range.start > 0) {
		const previousLineStart = lineStartOffset(text, range.start - 1);

		if (isBlank(text, previousLineStart, range.start - 1)) {
			return { start: previousLineStart, end: range.end };
		}
	}

	return range;
}

/**
 * The leading whitespace of the line holding an offset.
 */
function _lineIndentOf(text: string, offset: number): string {
	const lineStart = text.lastIndexOf('\n', offset - 1) + 1;

	return /^[ \t]*/.exec(text.slice(lineStart, offset))?.[0] ?? '';
}

/**
 * The expectations a rename produces for one statement.
 */
function _renameExpectations(quad: SynthesisContext['model']['quadContexts'][number], oldIri: string, newIri: string): QuadExpectation[] {
	const expectations: QuadExpectation[] = [];
	const subjectIsOld = quad.subject.termType === 'NamedNode' && quad.subject.value === oldIri;
	const objectIsOld = quad.object.termType === 'NamedNode' && quad.object.value === oldIri;

	if (!subjectIsOld && !objectIsOld) {
		return expectations;
	}

	const subject = subjectIsOld ? { kind: 'iri' as const, iri: oldIri } : toTermPattern(quad.subject);
	const object = objectIsOld ? { kind: 'iri' as const, iri: oldIri } : toTermPattern(quad.object);
	const newSubject = subjectIsOld ? { kind: 'iri' as const, iri: newIri } : subject;
	const newObject = objectIsOld ? { kind: 'iri' as const, iri: newIri } : object;

	expectations.push({ subject, predicate: quad.predicate.value, object, delta: -1 });
	expectations.push({ subject: newSubject, predicate: quad.predicate.value, object: newObject, delta: 1 });

	return expectations;
}

/**
 * Adds, deletes and renames subjects, and adds nested nodes.
 */
export class SubjectOperations {
	/**
	 * Create the operations of one user action.
	 * @param _context The shared state of the action.
	 */
	constructor(private readonly _context: SynthesisContext) { }

	/**
	 * Describe a new resource at the end of the document, or at the end of a graph block in TriG,
	 * with one blank line before it. A resource needs at least one statement to exist in the text.
	 */
	addSubject(operation: AddSubjectOperation): EditPlan {
		const context = this._context;

		validateIri(operation.iri);

		if (context.model.blocksBySubject.has(`i:${operation.iri}`)) {
			throw new EditRejectionError('inUse', 'The resource is already described in the document. Add properties to it instead.');
		}

		if (operation.initial.length === 0) {
			throw new EditRejectionError('invalidTerm', 'A resource needs at least one statement.');
		}

		const subject: TermRef = { kind: 'iri', iri: operation.iri };
		const written = this._writeBlock(subject, operation.initial, operation.graph);
		const insertion = operation.after
			? this.afterBlockInsertion(operation.after)
			: operation.graph && this._isTriG() ? this._graphInsertion(operation.graph) : this.documentEndInsertion();
		const edit = { start: insertion.start, end: insertion.end, newText: insertion.prefix + written.text + insertion.suffix };

		return createPlan({
			edits: [edit, ...insertion.extraEdits],
			expectations: operation.initial.map(statement => ({ subject, predicate: statement.predicate, object: toPatternFromRef(statement.value), delta: 1 })),
			quadCountDelta: operation.initial.length,
			focus: { edit, offsetWithin: insertion.prefix.length + written.subjectOffset, target: 'subject' }
		});
	}

	/**
	 * Remove every statement about a resource. A named resource loses all its blocks, with the
	 * comments that introduce them; an anonymous node written inline goes with the value that holds
	 * it; a collection head cannot be removed on its own.
	 */
	deleteSubject(operation: DeleteSubjectOperation): EditPlan {
		const context = this._context;

		if (operation.subject.kind === 'bnode' && context.model.collections.has(operation.subject.id)) {
			throw new EditRejectionError('unsupportedConstruct', 'A list cannot be deleted on its own. Delete the value holding it instead.');
		}

		const blocks = new StatementLocator(context.model).blocksOf(operation.subject);
		const nested = blocks.find(block => block.nested);

		if (nested && operation.subject.kind === 'bnode') {
			return new ValueOperations(context).deleteValue(this._parentLocation(operation.subject.id));
		}

		const { text, quadContexts } = context.model;
		const plan = createPlan({});

		for (const block of blocks) {
			const range = this._blockWithCommentsRange(block);
			const lines = absorbBlankLine(text, expandToWholeLines(text, range.start, range.end));

			// The comments around a block describe the resource and go with it, so the range is
			// removed as a whole rather than around them.
			plan.edits.push({ start: lines.start, end: lines.end, newText: '' });
			plan.quadCountDelta -= quadContexts.filter(quad => quad.subjectToken.startOffset >= range.start && quad.objectToken.startOffset < range.end).length;

			for (const group of block.groups) {
				for (const object of group.objects) {
					plan.expectations.push({ subject: toPatternFromRef(toTermRef(block.subject)), predicate: group.predicateIri, object: toTermPattern(object.quad.object), delta: -1 });
				}
			}
		}

		return plan;
	}

	/**
	 * Give a resource a new IRI wherever the document mentions it, in subject and object position
	 * alike. Prefix and base declarations are left alone.
	 */
	renameSubject(operation: RenameSubjectOperation): EditPlan {
		const context = this._context;

		if (operation.subject.kind !== 'iri') {
			throw new EditRejectionError('invalidTerm', 'Only a resource with an IRI can be renamed.');
		}

		validateIri(operation.iri);

		if (context.model.blocksBySubject.has(`i:${operation.iri}`)) {
			throw new EditRejectionError('inUse', 'A resource with this IRI is already described in the document.');
		}

		new StatementLocator(context.model).blocksOf(operation.subject);

		const oldIri = operation.subject.iri;
		const written = context.writer.writeIri(operation.iri);
		const plan = createPlan({});
		const { tokens, quadContexts } = context.model;

		tokens.forEach((token, index) => {
			if (this._resolveIri(index) === oldIri) {
				const edit = { start: token.startOffset, end: tokenEnd(token), newText: written };

				plan.edits.push(edit);
				plan.focus = plan.focus ?? { edit, offsetWithin: 0, target: 'subject' };
			}
		});

		for (const quad of quadContexts) {
			plan.expectations.push(..._renameExpectations(quad, oldIri, operation.iri));
		}

		return plan;
	}

	/**
	 * Add an inline blank node as a value, written with its first statements so it exists as a
	 * resource of its own that the form can open right away.
	 */
	addNestedNode(operation: AddNestedNodeOperation): EditPlan {
		const context = this._context;

		if (operation.initial.length === 0) {
			throw new EditRejectionError('invalidTerm', 'A blank node needs at least one statement.');
		}

		if (!context.writer.abbreviates) {
			throw new EditRejectionError('unsupportedSyntax', 'Inline blank nodes cannot be written in this syntax.');
		}

		const statements = operation.initial.map(statement => `${context.writer.writePredicate(statement.predicate)} ${context.writer.writeObject(statement.value)}`);
		const plan = new ValueOperations(context).appendWrittenValue(operation.parent, operation.predicate, `[ ${statements.join(' ; ')} ]`);
		const node = { kind: 'anyBlankNode' as const };

		plan.expectations.push({ subject: toPatternFromRef(operation.parent), predicate: operation.predicate, object: node, delta: 1 });

		for (const statement of operation.initial) {
			plan.expectations.push({ subject: node, predicate: statement.predicate, object: toPatternFromRef(statement.value), delta: 1 });
		}

		plan.quadCountDelta += 1 + operation.initial.length;

		return plan;
	}

	/**
	 * Write the statements of a new subject in the style of the document.
	 */
	private _writeBlock(subject: TermRef, initial: AddSubjectOperation['initial'], graph?: string): { text: string; subjectOffset: number } {
		const context = this._context;

		const { writer, style } = context;
		const written = writer.writeSubject(subject);

		if (!writer.abbreviates) {
			const graphText = graph && context.input.syntax === RdfSyntax.NQuads ? ` ${writer.writeIri(graph)}` : '';
			const lines = initial.map(statement => `${written} ${writer.writePredicate(statement.predicate)} ${writer.writeObject(statement.value)}${graphText} .`);

			return { text: lines.join(style.eol), subjectOffset: 0 };
		}

		const indent = style.predicateIndent;
		const statements = initial.map(statement => `${writer.writePredicate(statement.predicate)} ${writer.writeObject(statement.value)}`);
		const text = statements.length === 1
			? `${written} ${statements[0]} .`
			: `${written} ${statements.join(` ;${style.eol}${indent}`)} .`;

		return { text, subjectOffset: 0 };
	}

	/**
	 * Where a new block goes at the end of the document: after the last content, separated by one
	 * blank line, replacing whatever trailing whitespace the file has.
	 */
	documentEndInsertion(): BlockInsertion {
		const context = this._context;

		const { text } = context.model;
		const { eol } = context.style;
		const lastContent = text.trimEnd().length;

		return {
			start: lastContent,
			end: text.length,
			prefix: lastContent === 0 ? '' : `${eol}${eol}`,
			suffix: eol,
			extraEdits: []
		};
	}

	/**
	 * Where a new block goes when it follows a given resource: right after the last block written
	 * about that resource, a blank line apart, inside whatever graph that block is in. A block that
	 * omits its period receives one, because a block now follows it.
	 * @param after The resource whose last block the new one follows.
	 * @throws When the resource is not written in the document.
	 */
	afterBlockInsertion(after: TermRef): BlockInsertion {
		const context = this._context;

		const blocks = new StatementLocator(context.model).blocksOf(after).filter(block => !block.nested);
		const block = blocks[blocks.length - 1];

		if (!block) {
			throw new EditRejectionError('notFound', 'The resource to add after is not written in the document.');
		}

		const end = block.terminator ? tokenEnd(block.terminator) : block.end;
		const { eol } = context.style;

		return {
			start: end,
			end,
			prefix: `${eol}${eol}`,
			suffix: '',
			extraEdits: block.terminator ? [] : [{ start: block.end, end: block.end, newText: ' .' }]
		};
	}

	/**
	 * Where a new block goes inside a TriG graph block: before its closing brace, indented like the
	 * statements already in it. A last statement that omits its period receives one, because a
	 * statement now follows it.
	 */
	private _graphInsertion(graph: string): BlockInsertion {
		const context = this._context;

		const { text, blocks } = context.model;
		const inGraph = blocks.filter(block => block.graph === graph && block.graphBlock);
		const graphBlock = inGraph[inGraph.length - 1]?.graphBlock ?? this._graphBlockByLabel(graph);

		if (!graphBlock) {
			throw new EditRejectionError('notFound', 'The graph is not written in the document.');
		}

		const last = inGraph[inGraph.length - 1];
		const indent = last ? _lineIndentOf(text, last.start) : context.style.indentUnit;
		const closeLineStart = text.lastIndexOf('\n', graphBlock.close.startOffset - 1) + 1;
		const closeOnOwnLine = isBlank(text, closeLineStart, graphBlock.close.startOffset);
		const extraEdits = last && !last.terminator ? [{ start: last.end, end: last.end, newText: ' .' }] : [];

		if (closeOnOwnLine) {
			return { start: closeLineStart, end: closeLineStart, prefix: indent, suffix: context.style.eol, extraEdits };
		}

		return { start: graphBlock.close.startOffset, end: graphBlock.close.startOffset, prefix: `${context.style.eol}${indent}`, suffix: `${context.style.eol}`, extraEdits };
	}

	/**
	 * Find an empty graph block by the label written before its opening brace.
	 */
	private _graphBlockByLabel(graph: string): { open: { startOffset: number }; close: { startOffset: number } } | undefined {
		const context = this._context;

		const { tokens, graphBlocks } = context.model;

		return graphBlocks.find(block => {
			const openIndex = tokens.indexOf(block.open);
			const labelIndex = previousNonCommentTokenIndex(tokens, openIndex);

			return labelIndex >= 0 && this._resolveIri(labelIndex) === graph;
		});
	}

	/**
	 * The location of the value holding an anonymous blank node. A node written as an item of a
	 * list is not held by a value of its own and cannot be removed this way.
	 */
	private _parentLocation(id: string): ValueLocation {
		const context = this._context;

		for (const block of context.model.blocks) {
			for (const group of block.groups) {
				for (const object of group.objects) {
					if (object.quad.object.termType === 'BlankNode' && object.quad.object.value === id) {
						return { subject: toTermRef(block.subject), predicate: group.predicateIri, anchor: object.start };
					}

					if (object.items?.some(item => item.term.termType === 'BlankNode' && item.term.value === id)) {
						throw new EditRejectionError('unsupportedConstruct', 'A node inside a list cannot be deleted on its own. Edit the list instead.');
					}
				}
			}
		}

		throw new EditRejectionError('notFound', 'The blank node is not held by any value.');
	}

	/**
	 * The range of a block including the comment lines introducing it, its terminator, and the
	 * comment trailing its last line.
	 *
	 * Only the comments written directly above the block are taken: the reader reports the comments
	 * of a block on its first statement, but a comment written inside an earlier block ends up in
	 * that list too, and reaching back to it would delete the text between them, which belongs to
	 * another resource. Each comment is therefore accepted only while nothing but blank space
	 * separates it from what has been taken so far.
	 */
	private _blockWithCommentsRange(block: SubjectBlock): { start: number; end: number } {
		const context = this._context;

		const range = new ValueOperations(context).blockDeletionRange(block);
		const quads = block.groups.flatMap(group => group.objects.map(object => object.quad));
		const leading = quads[0]?.leadingComments ?? [];
		const trailing = quads.map(quad => quad.trailingComment).find(comment => comment && comment.startOffset >= range.end);
		const end = trailing && isBlank(context.model.text, range.end, trailing.startOffset) ? tokenEnd(trailing) : range.end;

		let start = range.start;

		for (let i = leading.length - 1; i >= 0; i--) {
			const comment = leading[i];

			if (comment.startOffset < start && isWhitespace(context.model.text, tokenEnd(comment), start)) {
				start = comment.startOffset;
			}
		}

		return { start, end };
	}

	/**
	 * Resolve the IRI a token denotes, or `undefined` for tokens that are not IRIs or that belong
	 * to a prefix or base declaration.
	 */
	private _resolveIri(index: number): string | undefined {
		const context = this._context;

		const { tokens } = context.model;
		const token = tokens[index];

		if (!isTokenOfType(token, RdfToken.IRIREF.name, RdfToken.PNAME_LN.name, RdfToken.PNAME_NS.name)) {
			return undefined;
		}

		const previous = tokens[previousNonCommentTokenIndex(tokens, index)];
		const beforePrevious = tokens[previousNonCommentTokenIndex(tokens, previousNonCommentTokenIndex(tokens, index))];
		const directives = [RdfToken.PREFIX.name, RdfToken.TTL_PREFIX.name, RdfToken.BASE.name];

		if (isTokenOfType(previous, ...directives) || (isTokenOfType(previous, RdfToken.PNAME_NS.name) && isTokenOfType(beforePrevious, ...directives))) {
			return undefined;
		}

		return token.tokenType.name === RdfToken.IRIREF.name
			? getIriFromIriReference(token.image)
			: getIriFromPrefixedName(context.input.namespaces, token.image);
	}

	/**
	 * Indicate whether the document is TriG.
	 */
	private _isTriG(): boolean {
		const context = this._context;

		return context.input.syntax === RdfSyntax.TriG;
	}

}
