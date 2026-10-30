import { IToken } from '@faubulous/mentor-rdf-parsers';
import { TextEditSpec, deleteRange, expandToWholeLines } from '@src/utilities/text-edits';
import { lineEndOffset } from '@src/utilities/string';
import { tokenEnd } from '@src/utilities/tokens';
import { EditRejectionError } from '../edit-rejection';
import { SubjectBlock } from '../statement-model';
import { StatementValueWriter } from '../statement-value-writer';
import { SynthesisContext } from '../synthesis-context';
import { NewValue, ValueList, ValueListEntry, ValueListGroup } from '../value-list';

/**
 * Writes an edit of the values of a predicate into a document that writes one statement per line,
 * as N-Triples and N-Quads do: a value that goes takes its line with it, and a new value is a line
 * of its own next to the line of its neighbour, with the subject written as the document writes
 * it and the graph of that line.
 */
export class StatementLineWriter {

	/**
	 * Create a writer for one action.
	 * @param _context The shared state of the action.
	 * @param _predicate The IRI of the predicate.
	 * @param _list The resolved edit.
	 * @param _values Writes the new values.
	 */
	constructor(
		private readonly _context: SynthesisContext,
		private readonly _predicate: string,
		private readonly _list: ValueList,
		private readonly _values: StatementValueWriter
	) { }

	/**
	 * Write the edit of a predicate the subject carries.
	 * @returns The edits.
	 * @throws {EditRejectionError} If a value cannot be written in the syntax.
	 */
	write(): TextEditSpec[] {
		return this._list.groups.flatMap(entry => this._editLine(entry));
	}

	/**
	 * Write the lines of a predicate the subject does not carry yet, after the last line of the
	 * subject, in its graph.
	 * @param block The last block of the subject.
	 * @returns The edits.
	 * @throws {EditRejectionError} If a value cannot be written in the syntax.
	 */
	writeNewPredicate(block: SubjectBlock): TextEditSpec[] {
		return [this._insertAfter(block, this._lines(block, this._list.added))];
	}

	/**
	 * The edits of one line: kept as it is, removed, replaced by new lines, or with new lines
	 * before or after it.
	 * @param entry The statement of the line.
	 * @returns The edits.
	 */
	private _editLine(entry: ValueListGroup): TextEditSpec[] {
		const { block, entries } = entry;
		const keptIndex = entries.findIndex(item => item.kind === 'kept');

		if (keptIndex < 0) {
			return entries.length === 0 ? this._deleteLine(block) : [this._replaceLine(block, this._lines(block, _newValues(entries)))];
		}

		const before = _newValues(entries.slice(0, keptIndex));
		const after = _newValues(entries.slice(keptIndex + 1));
		const edits: TextEditSpec[] = [];

		if (before.length > 0) {
			edits.push(this._insertBefore(block, this._lines(block, before)));
		}

		if (after.length > 0) {
			edits.push(this._insertAfter(block, this._lines(block, after)));
		}

		return edits;
	}

	/**
	 * Write the lines of new values in the subject and graph of a line, each written as the line
	 * writes it.
	 * @param block The line.
	 * @param values The values.
	 * @returns The lines.
	 */
	private _lines(block: SubjectBlock, values: readonly NewValue[]): string[] {
		const { text } = this._context.model;
		const subject = _textOf(text, block.subjectToken);
		const predicate = this._context.writer.writePredicate(this._predicate);
		const graph = block.graphToken ? ` ${_textOf(text, block.graphToken)}` : '';

		return values.map(value => `${subject} ${predicate} ${this._values.write(value)}${graph} .`);
	}

	/**
	 * Insert lines before a line.
	 * @param block The line.
	 * @param lines The lines.
	 * @returns The edit.
	 */
	private _insertBefore(block: SubjectBlock, lines: readonly string[]): TextEditSpec {
		return { start: block.start, end: block.start, newText: lines.join(this._context.style.eol) + this._context.style.eol };
	}

	/**
	 * Insert lines after a line, past a comment that ends it.
	 * @param block The line.
	 * @param lines The lines.
	 * @returns The edit.
	 */
	private _insertAfter(block: SubjectBlock, lines: readonly string[]): TextEditSpec {
		const { eol } = this._context.style;
		const offset = lineEndOffset(this._context.model.text, _lineEnd(block));

		return { start: offset, end: offset, newText: eol + lines.join(eol) };
	}

	/**
	 * Replace a line with new lines.
	 * @param block The line.
	 * @param lines The lines.
	 * @returns The edit.
	 */
	private _replaceLine(block: SubjectBlock, lines: readonly string[]): TextEditSpec {
		return { start: block.start, end: _lineEnd(block), newText: lines.join(this._context.style.eol) };
	}

	/**
	 * Delete a line with its line break.
	 * @param block The line.
	 * @returns The edits.
	 */
	private _deleteLine(block: SubjectBlock): TextEditSpec[] {
		const { text, tokens } = this._context.model;
		const lines = expandToWholeLines(text, block.start, _lineEnd(block));

		return deleteRange(text, tokens, lines.start, lines.end);
	}
}

/**
 * The new values among some entries.
 * @param entries The entries.
 * @returns The values, in order.
 */
function _newValues(entries: readonly ValueListEntry[]): NewValue[] {
	return entries.flatMap(entry => entry.kind === 'new' ? [entry.value] : []);
}

/**
 * The offset a line ends at: past the period that ends its statement.
 * @param block The line.
 * @returns The offset.
 * @throws {EditRejectionError} If the statement has no period.
 */
function _lineEnd(block: SubjectBlock): number {
	if (!block.terminator) {
		throw new EditRejectionError('unsupportedConstruct', 'The statement is not ended by a period.');
	}

	return tokenEnd(block.terminator);
}

/**
 * The text a token is written as.
 * @param text The document text.
 * @param token The token.
 * @returns The text of the token.
 */
function _textOf(text: string, token: IToken): string {
	return text.slice(token.startOffset, tokenEnd(token));
}

