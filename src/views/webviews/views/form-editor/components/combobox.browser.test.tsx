import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from '@testing-library/react';
import { useState } from 'react';
import { coverPage } from '@src/utilities/mocks/webview-test-utils';
import { narrowByMatch } from '../services/term-ranking';
import { Combobox, ComboboxOption } from './combobox';

const OPTIONS: ComboboxOption<string>[] = [
	{ label: 'Tree', detail: 'http://example.org/Tree', value: 'ex:Tree' },
	{ label: 'Apple tree', detail: 'http://example.org/AppleTree', value: 'ex:AppleTree' },
	{ label: 'Plant', detail: 'http://example.org/Plant', value: 'ex:Plant' }
];

/**
 * A combobox holding its own text, as a row does, offering the options that match it by their
 * labels and prefixed names, as the pickers match them.
 */
function Harness(props: { onPick: (value: string) => void; onCreate: (text: string) => void; onCancel: () => void }): React.JSX.Element {
	const [text, setText] = useState('');
	const options = narrowByMatch(OPTIONS, text, option => [option.label, option.value]);

	return <Combobox text={text} onTextChange={setText} options={options} label="Resource" {...props} />;
}

/**
 * Render a combobox and put the caret in it.
 */
async function renderCombobox() {
	const callbacks = { onPick: vi.fn(), onCreate: vi.fn(), onCancel: vi.fn() };
	const { container } = render(<Harness {...callbacks} />);
	const field = container.querySelector('vscode-textfield')!;

	await (field as unknown as { updateComplete: Promise<unknown> }).updateComplete;
	await userEvent.click(field);

	return { container, field, ...callbacks };
}

/**
 * The labels of the options the list shows, the highlighted one marked.
 */
function shown(container: HTMLElement): string[] {
	return Array.from(container.querySelectorAll('.combobox-option')).map(option => `${option.classList.contains('is-active') ? '>' : ''}${option.querySelector('.combobox-option-label')?.textContent}`);
}

describe('Combobox', () => {
	it('lists the options the typed text matches, the best first and highlighted, and picks it with Enter', async () => {
		const { container, onPick } = await renderCombobox();

		await userEvent.keyboard('tree');

		expect(shown(container)).toEqual(['>Tree', 'Apple tree']);

		await userEvent.keyboard('{Enter}');

		expect(onPick).toHaveBeenCalledWith('ex:Tree');
		expect(shown(container)).toEqual([]);
	});

	it('moves the highlight with the arrows', async () => {
		const { container, onPick } = await renderCombobox();

		await userEvent.keyboard('ex:');
		await userEvent.keyboard('{ArrowDown}{ArrowDown}');

		expect(shown(container)).toEqual(['Tree', 'Apple tree', '>Plant']);

		await userEvent.keyboard('{ArrowDown}{Enter}');

		expect(onPick).toHaveBeenCalledWith('ex:Tree');

		await userEvent.keyboard('{Control>}a{/Control}http');

		expect(shown(container)).toEqual([]);
	});

	it('takes the typed text with Enter when nothing matches it', async () => {
		const { onCreate, onPick } = await renderCombobox();

		await userEvent.keyboard('ex:Shrub{Enter}');

		expect(onCreate).toHaveBeenCalledWith('ex:Shrub');
		expect(onPick).not.toHaveBeenCalled();
	});

	it('closes the list with Escape, and cancels with Escape on a closed list', async () => {
		const { container, onCancel } = await renderCombobox();

		await userEvent.keyboard('pla');
		await userEvent.keyboard('{Escape}');

		expect(shown(container)).toEqual([]);
		expect(onCancel).not.toHaveBeenCalled();

		await userEvent.keyboard('{Escape}');

		expect(onCancel).toHaveBeenCalled();
	});

	it('opens the list under the field, over everything laid out after it', async () => {
		const { container, field } = await renderCombobox();

		await userEvent.keyboard('t');

		const cover = coverPage();

		try {
			const list = container.querySelector<HTMLElement>('.combobox-list')!;
			const box = list.getBoundingClientRect();
			const option = container.querySelector('.combobox-option')!.getBoundingClientRect();

			expect(box.top).toBeGreaterThanOrEqual(field.getBoundingClientRect().bottom);
			expect(list.contains(document.elementFromPoint(option.left + option.width / 2, option.top + option.height / 2))).toBe(true);
		} finally {
			cover.remove();
		}
	});

	it('picks an option clicked, keeping the focus in the field', async () => {
		const { container, field, onPick } = await renderCombobox();

		await userEvent.keyboard('p');

		expect(shown(container)).toEqual(['>Plant', 'Apple tree']);

		await userEvent.click(container.querySelectorAll('.combobox-option')[0]);

		expect(onPick).toHaveBeenCalledWith('ex:Plant');
		expect(document.activeElement).toBe(field);
	});
});
