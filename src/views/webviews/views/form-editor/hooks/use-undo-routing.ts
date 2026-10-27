import { useEffect, useMemo } from 'react';
import { undoCommandOf } from '../services/native-undo';
import { UndoRouter } from '../services/undo-router';

/**
 * Route Ctrl+Z and its redo between the field being typed in and the document, following the
 * focus and the typing of the fields under a root.
 * @param root The root of the form.
 * @returns The key handler of the root: typing in the focused field is undone in the field, and
 * the key is then kept from VS Code; anything else is left to VS Code, which undoes the document.
 * It tells whether the field took the key.
 */
export function useUndoRouting(root: HTMLElement | null): (event: React.KeyboardEvent) => boolean {
	const router = useMemo(() => new UndoRouter(), []);

	useEffect(() => {
		if (!root) {
			return;
		}

		const onFocus = (event: Event) => router.focus(event.target as object);
		const onBlur = (event: Event) => router.blur(event.target as object);
		const onBeforeInput = (event: Event) => {
			const value = _valueOf(event.target);

			if (value !== undefined) {
				router.beforeInput(event.target as object, value, (event as InputEvent).inputType ?? '');
			}
		};

		root.addEventListener('focusin', onFocus, true);
		root.addEventListener('focusout', onBlur, true);
		root.addEventListener('beforeinput', onBeforeInput, true);

		return () => {
			root.removeEventListener('focusin', onFocus, true);
			root.removeEventListener('focusout', onBlur, true);
			root.removeEventListener('beforeinput', onBeforeInput, true);
		};
	}, [root, router]);

	return useMemo(() => (event: React.KeyboardEvent) => {
		const command = undoCommandOf(event);
		const field = event.target;
		const value = _valueOf(field);

		if (!command || value === undefined || router.route(field, command, value) === 'document') {
			return false;
		}

		// Kept from VS Code, whose undo would change the document; the field undoes the step.
		event.stopPropagation();
		window.setTimeout(() => router.settle(field, _valueOf(field) ?? ''), 0);

		return true;
	}, [router]);
}

/**
 * The text of a field the user types into, or `undefined` for anything else.
 * @param target The element that received the event.
 * @returns The text.
 */
function _valueOf(target: EventTarget | null): string | undefined {
	if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
		return target.value;
	}

	// A text field of vscode-elements keeps its input in its shadow root and its value on itself.
	const value = (target as { value?: unknown } | null)?.value;

	return target instanceof HTMLElement && typeof value === 'string' ? value : undefined;
}
