// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { SearchToolbar, SearchToolbarProps } from './search-toolbar';

/**
 * Render the widget with the given properties over sensible defaults, with its callbacks recorded.
 */
function renderWidget(props: Partial<SearchToolbarProps> = {}) {
	const callbacks = { onChange: vi.fn(), onPrevious: vi.fn(), onNext: vi.fn(), onClose: vi.fn(), onClearToken: vi.fn() };

	renderWebview(<SearchToolbar text="" matchCount={0} {...callbacks} {...props} />);

	return { ...callbacks, field: screen.getByLabelText('Find') as HTMLInputElement };
}

/**
 * The text that tells which match was stepped to of how many.
 */
function countText(): string {
	return document.querySelector('.search-toolbar-count')?.textContent ?? '';
}

describe('SearchToolbar', () => {
	it('tells how many resources match before a match was stepped to', () => {
		renderWidget({ text: 'tree', matchCount: 7 });

		expect(countText()).toBe('7 found');
	});

	it('tells which match was stepped to of how many', () => {
		renderWidget({ text: 'tree', matchCount: 7, matchIndex: 2 });

		expect(countText()).toBe('3 of 7');
	});

	it('tells that no resource matches, and leaves the arrows disabled', () => {
		renderWidget({ text: 'tree', matchCount: 0 });

		expect(countText()).toBe('No results');
		expect(document.querySelector('.search-toolbar-count')?.classList.contains('is-empty')).toBe(true);
		expect((screen.getByLabelText('Next Match (Enter)') as HTMLButtonElement).disabled).toBe(true);
	});

	it('tells nothing while nothing is looked for', () => {
		renderWidget({ matchCount: 30 });

		expect(countText()).toBe('');
	});

	it('reports the typed text, steps with Enter and Shift+Enter, and closes with Escape', () => {
		const { field, onChange, onNext, onPrevious, onClose } = renderWidget({ text: 'tree', matchCount: 7 });

		field.value = 'trees';
		fireEvent.input(field);
		fireEvent.keyDown(field, { key: 'Enter' });
		fireEvent.keyDown(field, { key: 'Enter', shiftKey: true });
		fireEvent.keyDown(field, { key: 'Escape' });

		expect(onChange).toHaveBeenCalledWith('trees');
		expect(onNext).toHaveBeenCalledOnce();
		expect(onPrevious).toHaveBeenCalledOnce();
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('steps and closes with its buttons', async () => {
		const { onNext, onPrevious, onClose } = renderWidget({ text: 'tree', matchCount: 7 });

		await userEvent.click(screen.getByLabelText('Next Match (Enter)'));
		await userEvent.click(screen.getByLabelText('Previous Match (Shift+Enter)'));
		await userEvent.click(screen.getByLabelText('Close (Escape)'));

		expect(onNext).toHaveBeenCalledOnce();
		expect(onPrevious).toHaveBeenCalledOnce();
		expect(onClose).toHaveBeenCalledOnce();
	});

	it('shows the definition tree node the list is narrowed to as a token that can be cleared', async () => {
		const { onClearToken } = renderWidget({ token: 'Person', matchCount: 4 });

		expect(screen.getByText('Person').classList.contains('search-toolbar-token')).toBe(true);
		expect(countText()).toBe('4 found');

		await userEvent.click(screen.getByLabelText('Show all resources, not only Person'));

		expect(onClearToken).toHaveBeenCalled();
	});
});
