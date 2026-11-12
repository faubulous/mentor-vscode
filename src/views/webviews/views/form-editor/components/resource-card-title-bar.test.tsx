// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { ResourceSummary } from '../form-editor-model';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { ResourceCardTitleBar } from './resource-card-title-bar';

const TREE = createResourceSummary('Tree', { usageCount: 2, position: { line: 3, character: 0 }, typeIri: 'http://x/Tree', typeLabel: 'Tree', typeLabels: ['Tree', 'Plant'] });

/**
 * Render the title bar of a card, with the callbacks of the form recorded.
 * @param summary The resource.
 * @param context What the form provides besides.
 * @param expanded Whether the card is expanded.
 */
function renderTitleBar(summary: ResourceSummary = TREE, context: Partial<FormEditorContextValue> = {}, expanded = true) {
	const onRevealInTextEditor = vi.fn();
	const onRemoveResource = vi.fn();
	const onToggle = vi.fn();
	const onToggleNested = vi.fn();

	const { container } = renderWebview(
		<FormEditorContext.Provider value={{ readOnly: false, namespaces: [], languageTags: {}, onRevealInTextEditor, onRemoveResource, ...context }}>
			<ResourceCardTitleBar summary={summary} expanded={expanded} nestedCollapsed={false} onToggle={onToggle} onToggleNested={onToggleNested} />
		</FormEditorContext.Provider>
	);

	return { container, onRevealInTextEditor, onRemoveResource, onToggle, onToggleNested };
}

/**
 * Pick an item of the ⋯ menu, as the menu reports a pick.
 */
async function pick(container: HTMLElement, value: string): Promise<void> {
	await act(async () => {
		container.querySelector('.resource-card-menu vscode-context-menu')!.dispatchEvent(new CustomEvent('vsc-context-menu-select', { detail: { value } }));
	});
}

describe('ResourceCardTitleBar', () => {
	it('toggles the card from the chevron, folds the nested cards and shows the usage count', async () => {
		const { onToggle, onToggleNested } = renderTitleBar();

		await userEvent.click(screen.getByRole('button', { name: 'Collapse' }));
		await userEvent.click(screen.getByRole('button', { name: 'Collapse all nested' }));

		expect(onToggle).toHaveBeenCalledTimes(1);
		expect(onToggleNested).toHaveBeenCalledTimes(1);
		expect(screen.getByTitle('2 usages').textContent).toBe('2 usages');
	});

	it('names every type of a collapsed card, and none of an expanded one', () => {
		const { container } = renderTitleBar(TREE, {}, false);

		expect(container.querySelector('.resource-card-types')?.textContent).toBe('Tree, Plant');
		expect(screen.queryByRole('button', { name: /all nested/ })).toBeNull();
	});

	it('leaves the types of an expanded card unsaid', () => {
		const { container } = renderTitleBar();

		expect(container.querySelector('.resource-card-types')?.textContent).toBe('');
	});

	it('reveals the resource in a text editor and removes it from the ⋯ menu', async () => {
		const { container, onRevealInTextEditor, onRemoveResource } = renderTitleBar();

		expect(screen.getByRole('button', { name: 'More actions' })).toBeTruthy();

		await pick(container, 'reveal');
		await pick(container, 'remove');

		expect(onRevealInTextEditor).toHaveBeenCalledWith({ line: 3, character: 0 });
		expect(onRemoveResource).toHaveBeenCalledWith(TREE.term);
	});

	it('puts the button that folds the nested cards before the usage count, so the count stays where it is', () => {
		const { container } = renderTitleBar();
		const bar = container.querySelector('.resource-card-title-bar')!;
		const children = Array.from(bar.children);

		expect(children.indexOf(bar.querySelector('[aria-label="Collapse all nested"]')!)).toBeLessThan(children.indexOf(bar.querySelector('.card-usage')!));
	});

	it('removes nothing from a document that cannot be written, and still reveals the resource', async () => {
		const { container, onRevealInTextEditor, onRemoveResource } = renderTitleBar(TREE, { readOnly: true });

		await pick(container, 'remove');
		await pick(container, 'reveal');

		expect(onRemoveResource).not.toHaveBeenCalled();
		expect(onRevealInTextEditor).toHaveBeenCalledTimes(1);
	});

	it('leaves the ⋯ menu out where it offers nothing', () => {
		renderTitleBar({ ...TREE, position: undefined }, { readOnly: true });

		expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
	});
});
