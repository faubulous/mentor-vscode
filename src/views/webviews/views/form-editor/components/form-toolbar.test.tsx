// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { FormToolbar, FormToolbarProps } from './form-toolbar';

/**
 * Render the toolbar with the given properties over sensible defaults.
 */
function renderToolbar(props: Partial<FormToolbarProps> = {}, filter: Partial<FormToolbarProps['filter']> = {}) {
	const onChange = vi.fn();
	const onToggleExternalDeclarations = vi.fn();
	const result = renderWebview(
		<FormToolbar
			filter={{ text: '', onChange, shortcut: 'Ctrl+F', ...filter }}
			externalDeclarationsHidden={false}
			onToggleExternalDeclarations={onToggleExternalDeclarations}
			{...props}
		/>
	);

	return { ...result, onChange, onToggleExternalDeclarations };
}

describe('FormToolbar', () => {
	it('shows the shortcut of an empty filter, and the count and a clear button while it narrows the list', async () => {
		renderToolbar();

		expect(screen.getByText('Ctrl+F')?.classList.contains('filter-shortcut')).toBe(true);

		const { onChange } = renderToolbar({}, { text: 'adhesive', matchCount: 7 });

		expect(screen.getByText('7')?.classList.contains('filter-count')).toBe(true);

		await userEvent.click(screen.getByLabelText('Clear filter'));

		expect(onChange).toHaveBeenCalledWith('');
	});

	it('reports the typed text and clears it with Escape', () => {
		const { onChange } = renderToolbar({}, { text: 'tree' });
		const field = screen.getByLabelText('Filter resources');

		(field as HTMLInputElement).value = 'trees';
		fireEvent.input(field);
		fireEvent.keyDown(field, { key: 'Escape' });

		expect(onChange).toHaveBeenNthCalledWith(1, 'trees');
		expect(onChange).toHaveBeenNthCalledWith(2, '');
	});

	it('shows the definition tree node the list is narrowed to as a token that can be cleared', async () => {
		const onClearToken = vi.fn();

		renderToolbar({}, { token: 'Person', onClearToken });

		expect(screen.getByText('Person')?.classList.contains('filter-token')).toBe(true);

		await userEvent.click(screen.getByLabelText('Show all resources, not only Person'));

		expect(onClearToken).toHaveBeenCalled();
	});

	it('offers to hide or show the external declarations in its menu', async () => {
		const { onToggleExternalDeclarations } = renderToolbar();

		await userEvent.click(screen.getByTitle('More actions'));
		await userEvent.click(screen.getByText('Hide External Declarations'));

		expect(onToggleExternalDeclarations).toHaveBeenCalled();

		renderToolbar({ externalDeclarationsHidden: true });
		await userEvent.click(screen.getAllByTitle('More actions')[1]);

		expect(screen.getByText('Show External Declarations')).toBeTruthy();
	});
	it('offers the languages of the document and all of them, and tells which was chosen', () => {
		const onSelectLanguage = vi.fn();
		const onSelectAll = vi.fn();

		renderToolbar({ languages: { languageTags: { en: 'en', 'en-us': 'en-US', de: 'de' }, activeLanguage: 'de', allLanguages: false, onSelectLanguage, onSelectAll } });

		const select = screen.getByLabelText('Language') as HTMLElement & { value: string };
		const options = Array.from(select.querySelectorAll('vscode-option')).map(option => option.getAttribute('value'));

		expect(options).toEqual(['*', 'en-us', 'en', 'de']);
		expect(select.querySelector('vscode-option[value="de"]')?.textContent).toBe('German');
		expect(select.getAttribute('value') ?? select.value).toBe('de');

		select.value = 'en-us';
		fireEvent(select, new Event('change'));
		select.value = '*';
		fireEvent(select, new Event('change'));

		expect(onSelectLanguage).toHaveBeenCalledWith('en-us');
		expect(onSelectAll).toHaveBeenCalledOnce();
	});

	it('names a language by its tag where its name is not known', () => {
		renderToolbar({ languages: { languageTags: { 'x-mentor': 'x-Mentor' }, allLanguages: true, onSelectLanguage: vi.fn(), onSelectAll: vi.fn() } });

		expect(screen.getByLabelText('Language').querySelector('vscode-option[value="x-mentor"]')?.textContent).toBe('x-Mentor');
	});

	it('shows no language switch for a document without language tags', () => {
		renderToolbar();

		expect(screen.queryByLabelText('Language')).toBeNull();
	});
});
