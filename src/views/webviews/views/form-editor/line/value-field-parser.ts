import { ValueKind } from '@src/utilities/value-kind';
import { splitPrefixedName } from '@src/utilities/prefixed-name';
import { LineLexer } from './line-lexer';
import { LineParser } from './line-parser';
import { LineToken, ValueGroup } from './line-token';
import { ValueField } from './value-field';

/**
 * The text written for a nested blank node typed on a row.
 */
export const NESTED_NODE_MARKER = '[]';

/**
 * Reads the values of a statement row from the text they are typed or written as.
 */
export class ValueFieldParser {
	private readonly _lexer = new LineLexer();

	/**
	 * Indicate whether a text reads as the name of a resource: a prefixed name or an `<iri>`.
	 * @param text The text.
	 * @returns `true` for a name.
	 */
	static isName(text: string): boolean {
		return /^<[^<>\s]*>?$/.test(text) || (splitPrefixedName(text) !== undefined && !/\s/.test(text));
	}

	/**
	 * Read what was typed into the field for a new value: a quoted literal, a new nested node, a
	 * list, a number or boolean, a resource name, or plain text, which becomes a literal unless
	 * the predicate takes resources.
	 * @param text The typed text.
	 * @param range What the predicate takes.
	 * @returns The field, or `undefined` when nothing was typed.
	 */
	parse(text: string, range: ValueKind): ValueField | undefined {
		const trimmed = text.trim();

		if (!trimmed) {
			return undefined;
		}

		if (/^\[\s*\]?$/.test(trimmed)) {
			return { kind: 'nestedNode' };
		}

		if (trimmed.startsWith('"') || trimmed.startsWith('(')) {
			return this._parseQuotedOrList(trimmed);
		}

		if (range !== 'literal' && LineLexer.bareDatatypeOf(trimmed)) {
			return { kind: 'shorthandLiteral', text: trimmed };
		}

		if (range === 'resource' || (range === 'any' && ValueFieldParser.isName(trimmed))) {
			return { kind: 'resource', text: trimmed };
		}

		return { kind: 'literal', value: text, suffix: '' };
	}

	/**
	 * Read the field of one value group of a line.
	 * @param group The group.
	 * @param text The text of the line the group was read from.
	 * @returns The field.
	 */
	parseGroup(group: ValueGroup, text: string): ValueField {
		if (group.list || group.items.length !== 1) {
			return { kind: 'source', text: text.slice(group.start, group.end) };
		}

		return this._parseToken(group.items[0]);
	}

	/**
	 * Read the items of a list value, each as the field it would be on a row of its own; a list
	 * within the list stays one source item.
	 * @param field The field of a value.
	 * @returns The items, or `undefined` when the value is not a list.
	 */
	listItemsOf(field: ValueField): ValueField[] | undefined {
		const text = field.kind === 'source' ? field.text.trim() : '';

		if (!text.startsWith('(') || !text.endsWith(')')) {
			return undefined;
		}

		const inner = `p ${text.slice(1, -1)}`;

		return this._lexer.valueGroups(this._lexer.tokenize(inner)).map(group => this.parseGroup(group, inner));
	}

	/**
	 * Count the markers for new nested nodes a value holds: one for a marker, those among the
	 * items of a list, none otherwise.
	 * @param field The field of a value.
	 * @returns The number of markers.
	 */
	countNestedNodeMarkers(field: ValueField): number {
		if (field.kind === 'nestedNode') {
			return 1;
		}

		return field.kind === 'source' ? this._lexer.tokenize(field.text).filter(token => token.kind === 'nestedNode').length : 0;
	}

	/**
	 * Indicate whether a field takes resources, so it offers resource completions.
	 * @param range What the predicate takes.
	 * @param text What has been typed so far.
	 * @returns `true` when resources are expected.
	 */
	expectsResource(range: ValueKind, text: string): boolean {
		if (range === 'literal') {
			return false;
		}

		const trimmed = text.trim();

		return range === 'resource' || trimmed === '' || (ValueFieldParser.isName(trimmed) && !LineLexer.bareDatatypeOf(trimmed));
	}

	/**
	 * Read a quoted literal or a list typed into a field; what is not one value stays source.
	 * @param text The trimmed text.
	 * @returns The field.
	 */
	private _parseQuotedOrList(text: string): ValueField {
		const groups = this._lexer.valueGroups(this._lexer.tokenize(`p ${text}`));

		if (groups.length !== 1) {
			return { kind: 'source', text };
		}

		const group = groups[0];

		return this.parseGroup({ ...group, start: group.start - 2, end: group.end - 2 }, text);
	}

	/**
	 * Read the field of a single token.
	 * @param token The token.
	 * @returns The field.
	 */
	private _parseToken(token: LineToken): ValueField {
		switch (token.kind) {
			case 'literal':
				return { kind: 'literal', value: LineParser.unescapeLiteral(token.value), suffix: token.suffix };
			case 'nestedNode':
				return { kind: 'nestedNode' };
			case 'iri':
				return { kind: 'resource', text: token.text };
			case 'name':
				return LineLexer.bareDatatypeOf(token.text) ? { kind: 'shorthandLiteral', text: token.text } : { kind: 'resource', text: token.text };
			default:
				return { kind: 'source', text: token.text };
		}
	}
}
