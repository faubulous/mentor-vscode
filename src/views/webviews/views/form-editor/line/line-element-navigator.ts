/**
 * The attribute that marks the element of a statement line.
 */
export const LINE_ATTRIBUTE = 'data-line';

/**
 * The attribute that marks a value stop: an element the vertical arrows stop at, one per row a
 * value takes: each value of a statement, the card of a nested node, and the field for the first
 * value of an empty statement.
 */
export const VALUE_STOP_ATTRIBUTE = 'data-value-stop';

/**
 * Finds the statement lines and value stops of a list in document order, so the vertical arrows
 * can walk them across statements and the cards nested in them.
 */
export class LineElementNavigator {
	/**
	 * Create a navigator.
	 * @param _root The document, shadow root or element to search.
	 */
	constructor(private readonly _root: ParentNode) { }

	/**
	 * Create a navigator for the root an element belongs to.
	 * @param element The element.
	 * @returns The navigator.
	 */
	static forElement(element: HTMLElement): LineElementNavigator {
		return new LineElementNavigator(element.getRootNode() as ParentNode);
	}

	/**
	 * Get the statement line elements, in document order.
	 * @returns The elements.
	 */
	lineElements(): HTMLElement[] {
		return Array.from(this._root.querySelectorAll<HTMLElement>(`[${LINE_ATTRIBUTE}]`));
	}

	/**
	 * Find the statement line before or after an element, across cards.
	 * @param from The element of the current line.
	 * @param direction Which way.
	 * @returns The element, or `undefined` at the first or last line or for an element that is no line.
	 */
	nextLineElement(from: HTMLElement, direction: 'previous' | 'next'): HTMLElement | undefined {
		const lines = this.lineElements();
		const index = lines.indexOf(from);

		if (index < 0) {
			return undefined;
		}

		return lines[direction === 'next' ? index + 1 : index - 1];
	}

	/**
	 * Find the value stop above or below an element, across statements and the cards nested in
	 * them: the card of a nested node comes before the values inside it, and the value after the
	 * card after the last of them.
	 * @param from The element the caret is in, which need not be a stop itself.
	 * @param direction Which way.
	 * @returns The stop, or `undefined` past the first or last one.
	 */
	nextValueStop(from: HTMLElement, direction: 'previous' | 'next'): HTMLElement | undefined {
		const stops = Array.from(this._root.querySelectorAll<HTMLElement>(`[${VALUE_STOP_ATTRIBUTE}]`));
		const index = stops.indexOf(from);

		if (index >= 0) {
			return stops[direction === 'next' ? index + 1 : index - 1];
		}

		// An element that is no stop, such as the field for a new value after others, lies between two.
		const follows = (stop: HTMLElement): boolean => (from.compareDocumentPosition(stop) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

		return direction === 'next' ? stops.find(follows) : stops.filter(stop => !follows(stop)).pop();
	}
}
