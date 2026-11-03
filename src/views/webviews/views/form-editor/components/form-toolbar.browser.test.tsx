import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FormToolbar } from './form-toolbar';

/**
 * Render the toolbar with a language picker in an editor of a width, and measure its parts.
 * @param width The width of the editor.
 * @returns The boxes of the toolbar, the filter, the language picker and the menu.
 */
function renderToolbar(width: number) {
	const { container, unmount } = render(
		<div className="form-editor" style={{ width }}>
			<FormToolbar
				filter={{ text: '', onChange: vi.fn(), shortcut: 'Ctrl+F' }}
				languages={{ languageTags: { en: 'en', 'en-us': 'en-US', de: 'de' }, activeLanguage: 'en', allLanguages: false, onPick: vi.fn() }}
				externalDeclarationsHidden={false}
				onToggleExternalDeclarations={vi.fn()}
			/>
		</div>
	);

	const boxOf = (selector: string) => container.querySelector(selector)!.getBoundingClientRect();
	const boxes = { toolbar: boxOf('.form-toolbar'), filter: boxOf('.filter-field'), languages: boxOf('.language-picker'), menu: boxOf('.more-vert-container') };

	unmount();

	return boxes;
}

describe('FormToolbar, in a real browser', () => {
	it('keeps the language picker and the menu at their width in a narrow editor, where the filter gives way', () => {
		const wide = renderToolbar(1000);
		const narrow = renderToolbar(450);

		expect(narrow.languages.width).toBe(wide.languages.width);
		expect(narrow.menu.width).toBe(wide.menu.width);
		expect(narrow.menu.right).toBeLessThanOrEqual(narrow.toolbar.right);
		expect(narrow.filter.right).toBeLessThanOrEqual(narrow.languages.left);
		expect(narrow.filter.width).toBeLessThan(wide.filter.width);
	});
});
