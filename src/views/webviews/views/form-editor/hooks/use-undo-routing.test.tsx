// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { useUndoRouting } from './use-undo-routing';

/**
 * A form with one field, reporting whether the field took each undo key.
 */
function Form({ onKey }: { onKey: (tookIt: boolean) => void }) {
	const [root, setRoot] = useState<HTMLElement | null>(null);
	const routeUndo = useUndoRouting(root);

	return (
		<div ref={setRoot} onKeyDown={event => onKey(routeUndo(event))}>
			<input aria-label="label" defaultValue="Tree" />
		</div>
	);
}

describe('useUndoRouting', () => {
	it('leaves an undo to the document when nothing was typed, and gives it to the field after typing', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });

		const taken: boolean[] = [];

		renderWebview(<Form onKey={tookIt => taken.push(tookIt)} />);

		const field = screen.getByLabelText('label') as HTMLInputElement;

		field.focus();
		fireEvent.keyDown(field, { key: 'z', ctrlKey: true });

		expect(taken).toEqual([false]);

		// Typing the letter is a key of its own, which the field does not take either.
		await userEvent.type(field, 's');
		fireEvent.keyDown(field, { key: 'z', ctrlKey: true });

		expect(taken).toEqual([false, false, true]);

		// The field undid its step: back at the start, the next undo goes to the document.
		field.value = 'Tree';
		await vi.runAllTimersAsync();
		fireEvent.keyDown(field, { key: 'z', ctrlKey: true });

		expect(taken).toEqual([false, false, true, false]);

		vi.useRealTimers();
	});

	it('ignores keys that are not an undo or a redo', () => {
		const taken: boolean[] = [];

		renderWebview(<Form onKey={tookIt => taken.push(tookIt)} />);
		fireEvent.keyDown(screen.getByLabelText('label'), { key: 'a' });

		expect(taken).toEqual([false]);
	});
});
