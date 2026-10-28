import { splitPrefixedName } from '@src/utilities/prefixed-name';
import { LineLexer } from './line-lexer';
import { LineToken, ValueGroup } from './line-token';
import { LineVocabulary } from './line-vocabulary';
import { TermDescriber } from './term-describer';
import { ValueKind } from '@src/utilities/value-kind';

/**
 * Brings a line into the form it is stored in: items joined by single spaces, literals
 * re-serialized, separators removed, lists kept as `( … )`. A comment line is only trimmed.
 */
export class LineCanonicalizer {
	private readonly _lexer = new LineLexer();

	private readonly _describer: TermDescriber;

	/**
	 * Create a canonicalizer.
	 * @param vocabulary The vocabulary that decides the range of a predicate.
	 */
	constructor(vocabulary: LineVocabulary) {
		this._describer = new TermDescriber(vocabulary);
	}

	/**
	 * Write a value token in canonical form: literals as `"…"@lang` or `"…"^^datatype`, bare
	 * words quoted unless they are numbers, booleans or resources.
	 * @param token The token.
	 * @param range The range of the predicate.
	 * @returns The canonical text, or `undefined` for a dangling language tag, which is dropped.
	 */
	static canonicalValue(token: LineToken, range: ValueKind): string | undefined {
		if (token.kind === 'literal') {
			return _canonicalLiteral(token.value, token.language, token.datatype);
		}

		if (token.kind === 'languageTag') {
			return undefined;
		}

		if (token.kind === 'name' && !LineLexer.getDatatypeOf(token.text) && (range === 'literal' || (range === 'any' && !splitPrefixedName(token.text)))) {
			return `"${token.text}"`;
		}

		return token.text;
	}

	/**
	 * Indicate whether a line carries something: values after its predicate, or a comment.
	 * @param text The text of the line.
	 * @returns `true` when it does.
	 */
	hasValues(text: string): boolean {
		return LineLexer.isComment(text) || this._lexer.items(this._lexer.tokenize(text)).length > 1;
	}

	/**
	 * Count the blank-node placeholders of a line.
	 * @param text The text of the line.
	 * @returns The number of placeholders.
	 */
	placeholderCount(text: string): number {
		return this._lexer.tokenize(text).filter(token => token.kind === 'placeholder').length;
	}

	/**
	 * Bring a line into its canonical form.
	 * @param text The text of the line.
	 * @returns The canonical text.
	 */
	canonicalize(text: string): string {
		if (LineLexer.isComment(text)) {
			return text.trim();
		}

		const tokens = this._lexer.tokenize(text);
		const items = this._lexer.items(tokens);

		if (items.length === 0) {
			return '';
		}

		const range = this._describer.rangeOf(items[0]);
		const values = this._lexer.valueGroups(tokens).map(group => _canonicalGroup(group, range)).filter(value => value !== '');

		return [items[0].text, ...values].join(' ');
	}

	/**
	 * Remove the placeholders a line has beyond the blank nodes it stands for, which the user
	 * typed for new blank nodes, and bring the rest into canonical form.
	 * @param text The canonical text of the line.
	 * @param keep How many placeholders stand for existing blank nodes.
	 * @returns The canonical text without the extra placeholders.
	 */
	removeExtraPlaceholders(text: string, keep: number): string {
		let seen = 0;

		const kept = this._lexer.tokenize(text).filter(token => {
			if (token.kind !== 'placeholder') {
				return true;
			}

			seen++;

			return seen <= keep;
		});

		return this.canonicalize(kept.map(token => token.text).join(''));
	}
}

/**
 * Serialize a literal with its tag or datatype.
 * @param value The text between the quotes.
 * @param language The language tag, if any.
 * @param datatype The datatype as written, if any.
 * @returns The canonical text.
 */
function _canonicalLiteral(value: string, language: string | undefined, datatype: string | undefined): string {
	if (language) {
		return `"${value}"@${language}`;
	}

	return datatype ? `"${value}"^^${datatype}` : `"${value}"`;
}

/**
 * Write a value group: the term, or the list with its items canonicalized.
 * @param group The group.
 * @param range The range of the predicate.
 * @returns The canonical text, empty for a group that drops out.
 */
function _canonicalGroup(group: ValueGroup, range: ValueKind): string {
	const values = group.items.map(item => LineCanonicalizer.canonicalValue(item, range)).filter((value): value is string => value !== undefined);

	if (!group.list) {
		return values[0] ?? '';
	}

	return values.length > 0 ? `( ${values.join(' ')} )` : '( )';
}
