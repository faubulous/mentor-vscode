import { RDF } from '@faubulous/mentor-rdf';
import { RdfToken } from '@faubulous/mentor-rdf-parsers';
import { indentBefore } from '@src/utilities/string';
import { LocalStyle, StyleFallback } from './local-style';
import { PredicateGroup, StatementModel, SubjectBlock } from './statement-model';

/**
 * Detects how a document is written, so that inserted text looks like its neighbours, and tells
 * the indentation its blocks and groups are written with.
 */
export class LocalStyleDetector {
	/**
	 * The style of the document.
	 */
	readonly style: LocalStyle;

	/**
	 * Detect the style of a document.
	 * @param _model The statement model of the document.
	 * @param fallback The editor settings to fall back to.
	 */
	constructor(private readonly _model: StatementModel, fallback: StyleFallback) {
		this.style = this._detect(fallback);
	}

	/**
	 * Get the indentation the predicates of a block are written with.
	 * @param block The block to inspect.
	 * @returns The indentation.
	 */
	predicateIndentFor(block: SubjectBlock): string {
		const groups = block.nested ? block.groups : block.groups.slice(1);

		for (const group of groups) {
			const indent = indentBefore(this._model.text, group.start);

			if (indent !== undefined) {
				return indent;
			}
		}

		if (block.nested) {
			const outer = indentBefore(this._model.text, block.start) ?? this._lineIndent(block.start);

			return outer + this.style.indentUnit;
		}

		return this.style.predicateIndent;
	}

	/**
	 * Get the indentation the objects of a group are written with when they take a line each.
	 * @param block The block the group belongs to.
	 * @param group The group to inspect.
	 * @returns The indentation.
	 */
	objectIndentFor(block: SubjectBlock, group: PredicateGroup): string {
		for (const object of group.objects.slice(1)) {
			const indent = indentBefore(this._model.text, object.start);

			if (indent !== undefined) {
				return indent;
			}
		}

		return this.predicateIndentFor(block) + this.style.indentUnit;
	}

	/**
	 * Indicate whether the objects of a group are written one per line: some object after the
	 * first starts its line. An object following a nested node that spans lines, on the line the
	 * node ends on, is not written that way.
	 * @param group The group to inspect.
	 * @returns `true` if the objects take a line each, `false` otherwise.
	 */
	objectsOnePerLine(group: PredicateGroup): boolean {
		return group.objects.slice(1).some(object => indentBefore(this._model.text, object.start) !== undefined);
	}

	/**
	 * Indicate whether a block is written on a single line.
	 * @param block The block to inspect.
	 * @returns `true` if the block takes one line, `false` otherwise.
	 */
	isSingleLineBlock(block: SubjectBlock): boolean {
		const end = block.terminator ? block.terminator.startOffset : block.end;

		return !this._model.text.slice(block.start, end).includes('\n');
	}

	/**
	 * Detect the style of the document from its blocks, falling back to the editor settings.
	 * @param fallback The editor settings to fall back to.
	 * @returns The style of the document.
	 */
	private _detect(fallback: StyleFallback): LocalStyle {
		const indentUnit = fallback.insertSpaces ? ' '.repeat(Math.max(1, fallback.tabSize)) : '\t';
		const eol = fallback.eol ?? (this._model.text.includes('\r\n') ? '\r\n' : '\n');

		return {
			eol,
			indentUnit,
			predicateIndent: this._mostCommonPredicateIndent() ?? indentUnit,
			useTypeKeyword: this._usesTypeKeyword()
		};
	}

	/**
	 * Find the indentation most predicates are written with, counting only predicates that start
	 * their line.
	 * @returns The indentation, or `undefined` if no predicate starts a line.
	 */
	private _mostCommonPredicateIndent(): string | undefined {
		const counts = new Map<string, number>();

		for (const block of this._model.blocks) {
			if (block.nested) {
				continue;
			}

			for (const group of block.groups.slice(1)) {
				const indent = indentBefore(this._model.text, group.start);

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
	 * @returns `true` if `a` is used at least as often, `false` otherwise.
	 */
	private _usesTypeKeyword(): boolean {
		let keyword = 0;
		let full = 0;

		for (const block of this._model.blocks) {
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
	 * @param offset The offset into the text.
	 * @returns The leading whitespace of the line.
	 */
	private _lineIndent(offset: number): string {
		const text = this._model.text;
		const lineStart = text.lastIndexOf('\n', offset - 1) + 1;
		const match = /^[ \t]*/.exec(text.slice(lineStart, offset));

		return match ? match[0] : '';
	}
}
