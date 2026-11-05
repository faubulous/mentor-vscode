// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { ResourceSummary } from '../form-editor-model';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { ResourceCardFooter } from './resource-card-footer';

const TREE = createResourceSummary('Tree', { localPart: 'Tree' });

/**
 * Render the footer of a card, with the callbacks of the form recorded.
 * @param summary The resource.
 * @param context What the form provides besides.
 */
function renderFooter(summary: ResourceSummary = TREE, context: Partial<FormEditorContextValue> = {}) {
	const onRenameResource = vi.fn();
	const onOpenExternal = vi.fn();

	renderWebview(
		<FormEditorContext.Provider value={{ readOnly: false, namespaces: [], languageTags: {}, onRenameResource, onOpenExternal, ...context }}>
			<ResourceCardFooter summary={summary} />
		</FormEditorContext.Provider>
	);

	return { onRenameResource, onOpenExternal, field: screen.queryByLabelText('Local part of the IRI') as HTMLInputElement | null };
}

/**
 * Type into the field, as the user does.
 */
function type(field: HTMLElement, text: string): void {
	(field as HTMLInputElement).value = text;
	fireEvent.input(field);
}

describe('ResourceCardFooter', () => {
	it('shows the IRI with the namespace before its local part, and renames the resource to the local part typed when Enter is pressed', () => {
		const { field, onRenameResource } = renderFooter();

		expect(field?.value).toBe('Tree');
		expect(field?.querySelector('.resource-card-namespace')?.textContent).toBe('ex:');

		type(field!, 'Oak');
		fireEvent.keyDown(field!, { key: 'Enter' });

		expect(onRenameResource).toHaveBeenCalledWith(TREE.term, 'Oak');
	});

	it('renames when the field is left, and not to the same local part', () => {
		const { field, onRenameResource } = renderFooter();

		fireEvent.blur(field!);
		type(field!, 'Oak');
		fireEvent.blur(field!);

		expect(onRenameResource.mock.calls).toEqual([[TREE.term, 'Oak']]);
	});

	it('marks a local part that cannot be written as it is, renames nothing to it, and gives the text up on Escape', () => {
		const { field, onRenameResource } = renderFooter();

		type(field!, 'an oak');
		fireEvent.keyDown(field!, { key: 'Enter' });

		expect(field?.hasAttribute('invalid')).toBe(true);
		expect(onRenameResource).not.toHaveBeenCalled();

		fireEvent.keyDown(field!, { key: 'Escape' });

		expect(field?.value).toBe('Tree');
		expect(field?.hasAttribute('invalid')).toBe(false);
	});

	it('opens the IRI from the button in the gutter', async () => {
		const { onOpenExternal } = renderFooter();

		await userEvent.click(screen.getByRole('button', { name: 'Open IRI' }));

		expect(onOpenExternal).toHaveBeenCalledWith(TREE.term.value);
	});

	it('shows the IRI as text where the document cannot be written', () => {
		const { field } = renderFooter(TREE, { readOnly: true });

		expect(field).toBeNull();
		expect(screen.getByText('ex:Tree').classList.contains('resource-card-iri')).toBe(true);
	});

	it('shows the identifier of a blank node, which has no IRI to open or rename', () => {
		renderFooter({ ...TREE, term: RdfDataFactory.blankNode('b1'), prefixedName: undefined, localPart: undefined });

		expect(screen.getByText('_:b1')).toBeTruthy();
		expect(screen.queryByRole('button', { name: 'Open IRI' })).toBeNull();
	});
});
