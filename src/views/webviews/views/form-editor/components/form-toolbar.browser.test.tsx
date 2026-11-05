import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FormToolbar } from './form-toolbar';

/**
 * Render the toolbar with a language picker in an editor of a width, and measure its parts.
 * @param width The width of the editor.
 * @returns The boxes of the toolbar, the language picker and the menu.
 */
function renderToolbar(width: number) {
	const { container, unmount } = render(
		<div className="form-editor" style={{ width }}>
			<FormToolbar
				languages={{ languageTags: { en: 'en', 'en-us': 'en-US', de: 'de' }, activeLanguage: 'en', allLanguages: false, onPick: vi.fn() }}
				externalDeclarationsHidden={false}
				onToggleExternalDeclarations={vi.fn()}
			/>
		</div>
	);

	const boxOf = (selector: string) => container.querySelector(selector)!.getBoundingClientRect();
	const boxes = { toolbar: boxOf('.form-toolbar'), languages: boxOf('.language-picker'), menu: boxOf('.more-vert-container') };

	unmount();

	return boxes;
}

describe('FormToolbar, in a real browser', () => {
	it('puts the language picker and the menu at the end of a slim row, in a narrow editor too', () => {
		for (const width of [1000, 360]) {
			const { toolbar, languages, menu } = renderToolbar(width);

			expect(toolbar.height).toBeLessThanOrEqual(30);
			expect(menu.right).toBeLessThanOrEqual(toolbar.right);
			expect(languages.right).toBeLessThanOrEqual(menu.left);
			expect(languages.left).toBeGreaterThan(toolbar.left + toolbar.width / 2);
		}
	});
});
