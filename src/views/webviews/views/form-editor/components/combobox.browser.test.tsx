import { describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from '@testing-library/react';
import { useState } from 'react';
import { Combobox, ComboboxOption } from './combobox';

const OPTIONS: ComboboxOption<string>[] = [
	{ label: 'Tree', detail: 'ex:Tree\nhttp://example.org/Tree', keywords: 'ex:Tree', value: 'tree' },
	{ label: 'Apple tree', detail: 'ex:AppleTree\nhttp://example.org/AppleTree', keywords: 'ex:AppleTree', value: 'apple' },
	{ label: 'Plant', detail: 'ex:Plant\nhttp://example.org/Plant', keywords: 'ex:Plant', value: 'plant' }
];

/**
 * A combobox holding its own text, as a row does.
 */
function Harness(props: { onPick: (value: string) => void; onCreate: (text: string) => void; onCancel: () => void }): React.JSX.Element {
	const [text, setText] = useState('');

	return <Combobox text={text} onTextChange={setText} options={OPTIONS} label="Resource" {...props} />;
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

		expect(onPick).toHaveBeenCalledWith('tree');
		expect(shown(container)).toEqual([]);
	});

	it('moves the highlight with the arrows and matches the keywords as well, not the IRI', async () => {
		const { container, onPick } = await renderCombobox();

		await userEvent.keyboard('ex:');
		await userEvent.keyboard('{ArrowDown}{ArrowDown}');

		expect(shown(container)).toEqual(['Tree', 'Apple tree', '>Plant']);

		await userEvent.keyboard('{ArrowDown}{Enter}');

		expect(onPick).toHaveBeenCalledWith('tree');

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

	it('picks an option clicked, keeping the focus in the field', async () => {
		const { container, field, onPick } = await renderCombobox();

		await userEvent.keyboard('p');

		expect(shown(container)).toEqual(['>Plant', 'Apple tree']);

		await userEvent.click(container.querySelectorAll('.combobox-option')[0]);

		expect(onPick).toHaveBeenCalledWith('plant');
		expect(document.activeElement).toBe(field);
	});
});
