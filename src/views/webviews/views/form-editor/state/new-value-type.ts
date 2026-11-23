import { ValueKind } from '@src/utilities/value-kind';
import { TypedTermReader } from '../services/statement/typed-term-reader';

/**
 * What the text typed for a new value makes: a resource, or a literal.
 */
export type NewValueType = 'resource' | 'literal';

/**
 * What the input of a new value makes of the text typed into it, which the input shows after the
 * text: the type chosen for it, else a resource where the predicate takes resources only, a
 * literal where it takes literals only, and otherwise a resource while the text is empty or names
 * one, a literal for any other text.
 * @param text The text typed so far.
 * @param range What the predicate takes.
 * @param chosen The type chosen for the text, if any.
 * @returns The type.
 */
export function getNewValueType(text: string, range: ValueKind, chosen?: NewValueType): NewValueType {
	if (chosen) {
		return chosen;
	}

	if (range !== 'any') {
		return range;
	}

	const trimmed = text.trim();

	return trimmed === '' || TypedTermReader.isName(trimmed) ? 'resource' : 'literal';
}

/**
 * Indicate whether the text typed for a new value starts a literal at once, which then takes the
 * text in its own field: where the predicate takes literals only, from the first character, and
 * where it takes either, once the text can no longer become the name of a resource, as with a
 * space or a leading digit. Text a resource was chosen for stays in the input.
 * @param text The text typed so far.
 * @param range What the predicate takes.
 * @param chosen The type chosen for the text, if any.
 * @returns `true` when the text starts a literal.
 */
export function startsLiteral(text: string, range: ValueKind, chosen?: NewValueType): boolean {
	if (text.trim() === '' || range === 'resource' || chosen === 'resource') {
		return false;
	}

	return range === 'literal' || !TypedTermReader.couldBeName(text.trimStart());
}
