import { RDF } from '@faubulous/mentor-rdf';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';
import { PredicateGroup, StatementModel, SubjectBlock } from './statement-model';
import { indentBefore } from './token-scan';

/**
 * The editor settings used when the document itself gives no hint.
 */
export interface StyleFallback {
	tabSize: number;
	insertSpaces: boolean;
	/** The line ending of the document, detected from the text when omitted. */
	eol?: string;
	/** Whether new prefix declarations keep the declarations in alphabetical order. */
	sortPrefixes?: boolean;
}

/**
 * How the document is written, so that inserted text looks like its neighbours.
 */
export interface LocalStyle {
	eol: string;
	/** One level of indentation. */
	indentUnit: string;
	/** The indentation most predicates of the document are written with. */
	predicateIndent: string;
	/** Whether `rdf:type` is written as `a`. */
	useTypeKeyword: boolean;
}

/**
 * Detect the style of a document.
 * @param model The statement model.
 * @param fallback The editor settings to fall back to.
 */
export function detectLocalStyle(model: StatementModel, fallback: StyleFallback): LocalStyle {
	const indentUnit = fallback.insertSpaces ? ' '.repeat(Math.max(1, fallback.tabSize)) : '\t';
	const eol = fallback.eol ?? (model.text.includes('\r\n') ? '\r\n' : '\n');

	return {
		eol,
		indentUnit,
		predicateIndent: _mostCommonPredicateIndent(model) ?? indentUnit,
		useTypeKeyword: _usesTypeKeyword(model)
	};
}

/**
 * Get the indentation the predicates of a block are written with.
 * @param model The statement model.
 * @param style The document style.
 * @param block The block to inspect.
 */
export function predicateIndentFor(model: StatementModel, style: LocalStyle, block: SubjectBlock): string {
	const groups = block.nested ? block.groups : block.groups.slice(1);

	for (const group of groups) {
		const indent = indentBefore(model.text, group.start);

		if (indent !== undefined) {
			return indent;
		}
	}

	if (block.nested) {
		const outer = indentBefore(model.text, block.start) ?? _lineIndent(model.text, block.start);

		return outer + style.indentUnit;
	}

	return style.predicateIndent;
}

/**
 * Get the indentation the objects of a group are written with when they take a line each.
 * @param model The statement model.
 * @param style The document style.
 * @param block The block the group belongs to.
 * @param group The group to inspect.
 */
export function objectIndentFor(model: StatementModel, style: LocalStyle, block: SubjectBlock, group: PredicateGroup): string {
	for (const object of group.objects.slice(1)) {
		const indent = indentBefore(model.text, object.start);

		if (indent !== undefined) {
			return indent;
		}
	}

	return predicateIndentFor(model, style, block) + style.indentUnit;
}

/**
 * Indicate whether the objects of a group are written one per line: some object after the first
 * starts its line. An object following a nested node that spans lines, on the line the node ends
 * on, is not written that way.
 * @param model The statement model.
 * @param group The group to inspect.
 */
export function objectsOnePerLine(model: StatementModel, group: PredicateGroup): boolean {
	return group.objects.slice(1).some(object => indentBefore(model.text, object.start) !== undefined);
}

/**
 * Indicate whether a block is written on a single line.
 * @param model The statement model.
 * @param block The block to inspect.
 */
export function isSingleLineBlock(model: StatementModel, block: SubjectBlock): boolean {
	const end = block.terminator ? block.terminator.startOffset : block.end;

	return !model.text.slice(block.start, end).includes('\n');
}

/**
 * Find the indentation most predicates are written with, counting only predicates that start
 * their line.
 */
function _mostCommonPredicateIndent(model: StatementModel): string | undefined {
	const counts = new Map<string, number>();

	for (const block of model.blocks) {
		if (block.nested) {
			continue;
		}

		for (const group of block.groups.slice(1)) {
			const indent = indentBefore(model.text, group.start);

			if (indent !== undefined) {
				counts.set(indent, (counts.get(indent) ?? 0) + 1);
			}
		}
	}

	let best: string | undefined;
	let bestCount = 0;

	for (const [indent, count] of counts) {
		if (count > bestCount) {
			best = indent;
			bestCount = count;
		}
	}

	return best;
}

/**
 * Indicate whether the document writes `rdf:type` as `a` at least as often as in full.
 */
function _usesTypeKeyword(model: StatementModel): boolean {
	let keyword = 0;
	let full = 0;

	for (const block of model.blocks) {
		for (const group of block.groups) {
			if (group.predicateIri !== RDF.type) {
				continue;
			}

			if (group.predicateToken.tokenType?.name === RdfToken.A.name) {
				keyword++;
			} else {
				full++;
			}
		}
	}

	return keyword >= full;
}

/**
 * Get the leading whitespace of the line holding an offset.
 */
function _lineIndent(text: string, offset: number): string {
	const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
	const match = /^[ \t]*/.exec(text.slice(lineStart, offset));

	return match ? match[0] : '';
}
