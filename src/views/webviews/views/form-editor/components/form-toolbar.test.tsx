// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { FormToolbar, FormToolbarProps } from './form-toolbar';

/**
 * Render the toolbar with the given properties over sensible defaults.
 */
function renderToolbar(props: Partial<FormToolbarProps> = {}) {
	const onToggleExternalDeclarations = vi.fn();
	const result = renderWebview(
		<FormToolbar
			externalDeclarationsHidden={false}
			onToggleExternalDeclarations={onToggleExternalDeclarations}
			{...props}
		/>
	);

	return { ...result, onToggleExternalDeclarations };
}

describe('FormToolbar', () => {
	it('offers to hide or show the external declarations in its menu', async () => {
		const { onToggleExternalDeclarations } = renderToolbar();

		await userEvent.click(screen.getByTitle('More actions'));
		await userEvent.click(screen.getByText('Hide External Declarations'));

		expect(onToggleExternalDeclarations).toHaveBeenCalled();

		renderToolbar({ externalDeclarationsHidden: true });
		await userEvent.click(screen.getAllByTitle('More actions')[1]);

		expect(screen.getByText('Show External Declarations')).toBeTruthy();
	});
	it('names the language the document is read in, and asks for the language quick pick', async () => {
		const onPick = vi.fn();

		renderToolbar({ languages: { languageTags: { en: 'en', de: 'de' }, activeLanguage: 'de', allLanguages: false, onPick } });

		await userEvent.click(screen.getByRole('button', { name: 'Language: German' }));

		expect(onPick).toHaveBeenCalledOnce();
	});

	it('names all languages while every language is shown, or no language is chosen', () => {
		const { unmount } = renderToolbar({ languages: { languageTags: { en: 'en' }, activeLanguage: 'en', allLanguages: true, onPick: vi.fn() } });

		expect(screen.getByRole('button', { name: 'Language: All languages' })).toBeTruthy();

		unmount();
		renderToolbar({ languages: { languageTags: { en: 'en' }, allLanguages: false, onPick: vi.fn() } });

		expect(screen.getByRole('button', { name: 'Language: All languages' })).toBeTruthy();
	});

	it('names a language by its tag as the document spells it, where its name is not known', () => {
		renderToolbar({ languages: { languageTags: { 'x-mentor': 'x-Mentor' }, activeLanguage: 'x-mentor', allLanguages: false, onPick: vi.fn() } });

		expect(screen.getByRole('button', { name: 'Language: x-Mentor' })).toBeTruthy();
	});

	it('shows no language picker for a document without language tags', () => {
		renderToolbar();

		expect(screen.queryByRole('button', { name: /^Language/ })).toBeNull();
	});
});
