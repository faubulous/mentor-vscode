// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { EXAMPLE_NAMESPACE } from '@src/utilities/mocks/statement-fixtures';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { ResourceSummary } from '../form-editor-model';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { ResourceCardTitleBar } from './resource-card-title-bar';

const TREE = createResourceSummary('Tree', { localPart: 'Tree', usageCount: 2, position: { line: 3, character: 0 } });

/**
 * Render the title bar of a card, with the callbacks of the form recorded.
 * @param summary The resource.
 * @param context What the form provides besides.
 * @param expanded Whether the card is expanded.
 */
function renderTitleBar(summary: ResourceSummary = TREE, context: Partial<FormEditorContextValue> = {}, expanded = true) {
	const onRenameResource = vi.fn();
	const onOpenExternal = vi.fn();
	const onRevealInTextEditor = vi.fn();
	const onToggle = vi.fn();
	const onToggleNested = vi.fn();

	renderWebview(
		<FormEditorContext.Provider value={{ readOnly: false, namespaces: [], languageTags: {}, onRenameResource, onOpenExternal, onRevealInTextEditor, ...context }}>
			<ResourceCardTitleBar summary={summary} expanded={expanded} nestedCollapsed={false} onToggle={onToggle} onToggleNested={onToggleNested} />
		</FormEditorContext.Provider>
	);

	return { onRenameResource, onOpenExternal, onRevealInTextEditor, onToggle, onToggleNested, field: screen.queryByLabelText('IRI') as HTMLInputElement | null };
}

/**
 * Type into the field, as the user does.
 */
function type(field: HTMLElement, text: string): void {
	(field as HTMLInputElement).value = text;
	fireEvent.input(field);
}

describe('ResourceCardTitleBar', () => {
	it('shows the full IRI in one field, and renames the resource to the IRI typed when Enter is pressed', () => {
		const { field, onRenameResource } = renderTitleBar();

		expect(field?.value).toBe(TREE.term.value);

		type(field!, `${EXAMPLE_NAMESPACE}Oak`);
		fireEvent.keyDown(field!, { key: 'Enter' });

		expect(onRenameResource).toHaveBeenCalledWith(TREE.term, `${EXAMPLE_NAMESPACE}Oak`);
	});

	it('renames when the field is left, and not to the same IRI', () => {
		const { field, onRenameResource } = renderTitleBar();

		fireEvent.blur(field!);
		type(field!, `${EXAMPLE_NAMESPACE}Oak`);
		fireEvent.blur(field!);

		expect(onRenameResource.mock.calls).toEqual([[TREE.term, `${EXAMPLE_NAMESPACE}Oak`]]);
	});

	it('marks an IRI of another namespace or with a local part that cannot be written as it is, renames nothing to it, and gives the text up on Escape', () => {
		const { field, onRenameResource } = renderTitleBar();

		type(field!, 'http://other.org/ns#Tree');
		fireEvent.keyDown(field!, { key: 'Enter' });

		expect(field?.hasAttribute('invalid')).toBe(true);
		expect(field?.getAttribute('title')).toMatch(/namespace/);

		type(field!, `${EXAMPLE_NAMESPACE}an oak`);
		fireEvent.keyDown(field!, { key: 'Enter' });

		expect(field?.hasAttribute('invalid')).toBe(true);
		expect(onRenameResource).not.toHaveBeenCalled();

		fireEvent.keyDown(field!, { key: 'Escape' });

		expect(field?.value).toBe(TREE.term.value);
		expect(field?.hasAttribute('invalid')).toBe(false);
	});
	it('toggles the card from the chevron, folds the nested cards and reveals the resource from its buttons', async () => {
		const { onToggle, onOpenExternal, onToggleNested, onRevealInTextEditor } = renderTitleBar();

		await userEvent.click(screen.getByRole('button', { name: 'Collapse' }));
		await userEvent.click(screen.getByRole('button', { name: 'Collapse all nested' }));
		await userEvent.click(screen.getByRole('button', { name: 'Reveal in editor' }));

		expect(onToggle).toHaveBeenCalledTimes(1);
		expect(onOpenExternal).not.toHaveBeenCalled();
		expect(onToggleNested).toHaveBeenCalledTimes(1);
		expect(onRevealInTextEditor).toHaveBeenCalledWith({ line: 3, character: 0 });
		expect(screen.getByText('2 usages').classList.contains('card-usage')).toBe(true);
	});

	it('shows the full IRI of a collapsed card as a link that opens it, and no field', async () => {
		const { field, onOpenExternal, onRenameResource } = renderTitleBar(TREE, {}, false);

		expect(field).toBeNull();
		expect(screen.queryByRole('button', { name: /all nested/ })).toBeNull();

		await userEvent.click(screen.getByRole('button', { name: TREE.term.value }));

		expect(onOpenExternal).toHaveBeenCalledWith(TREE.term.value);
		expect(onRenameResource).not.toHaveBeenCalled();
	});

	it('shows the IRI as text where the document cannot be written', () => {
		const { field } = renderTitleBar(TREE, { readOnly: true });

		expect(field).toBeNull();
		expect(screen.getByText(TREE.term.value).classList.contains('resource-card-iri-text')).toBe(true);
		expect(screen.queryByRole('button', { name: TREE.term.value })).toBeNull();
	});

	it('shows the identifier of a blank node, which has no IRI to open or rename', () => {
		renderTitleBar({ ...TREE, term: RdfDataFactory.blankNode('b1'), prefixedName: undefined, localPart: undefined }, {}, false);

		expect(screen.getByText('_:b1').classList.contains('resource-card-iri-text')).toBe(true);
		expect(screen.queryByRole('button', { name: '_:b1' })).toBeNull();
	});
});
