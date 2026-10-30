import { InputFieldCaret } from '../../state/input-field-focus-request';

/**
 * The input a field element types into: the element itself when it is a native input, or the
 * input a VS Code text field or text area wraps in its shadow root.
 */
type NativeInput = HTMLInputElement | HTMLTextAreaElement;

/**
 * Reads and moves the caret of a field element of a statement row, whether it is a native
 * input, a VS Code text field or text area, or a pill, which has no caret.
 */
export class InputFieldElement {
	/**
	 * Wrap a field element.
	 * @param element The element that carries the `data-field` attribute.
	 */
	constructor(readonly element: HTMLElement) { }

	/**
	 * The text of the field, empty for a pill.
	 */
	get value(): string {
		const input = this._input;

		if (input) {
			return input.value;
		}

		const value = (this.element as { value?: unknown }).value;

		return typeof value === 'string' ? value : '';
	}

	/**
	 * The selection of the field, collapsed at the end when the field has no caret.
	 */
	get selection(): { start: number; end: number } {
		const input = this._input;

		if (!input) {
			const length = this.value.length;

			return { start: length, end: length };
		}

		return { start: input.selectionStart ?? 0, end: input.selectionEnd ?? 0 };
	}

	/**
	 * Move the focus into the field and place the caret. A VS Code element draws its input after
	 * it is connected, so the focus waits for it to be drawn.
	 * @param caret Where the caret goes.
	 */
	focus(caret: InputFieldCaret): void {
		const drawn = (this.element as { updateComplete?: Promise<unknown> }).updateComplete ?? Promise.resolve();

		void drawn.then(() => {
			this.element.focus({ preventScroll: true });

			const input = this._input;

			if (input) {
				const offset = caret === 'start' ? 0 : input.value.length;

				input.setSelectionRange(offset, offset);
			}

			this.element.scrollIntoView?.({ block: 'nearest' });
		});
	}

	/**
	 * The native input of the field, if it has one.
	 */
	private get _input(): NativeInput | undefined {
		if (this.element instanceof HTMLInputElement || this.element instanceof HTMLTextAreaElement) {
			return this.element;
		}

		const wrapped = (this.element as { wrappedElement?: unknown }).wrappedElement;

		return wrapped instanceof HTMLInputElement || wrapped instanceof HTMLTextAreaElement ? wrapped : undefined;
	}
}
