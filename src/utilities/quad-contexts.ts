import { IToken } from '@faubulous/mentor-rdf-parsers';

/**
 * Find the statements whose tokens lie inside a range, which is what a nested blank node or a
 * collection takes along when the value holding it is removed.
 * @param quadContexts The quad contexts of the document.
 * @param start The start of the range.
 * @param end The exclusive end of the range.
 * @returns The statements inside the range.
 */
export function statementsWithin<T extends { subjectToken: IToken; objectToken: IToken }>(quadContexts: readonly T[], start: number, end: number): T[] {
	return quadContexts.filter(
		quad => quad.subjectToken.startOffset >= start && quad.objectToken.startOffset < end && quad.objectToken.startOffset > start
	);
}
