// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { RDFS } from '@faubulous/mentor-rdf';
import { createIriView, createLiteralView, createProperty, createTestResourceDetail } from '@src/utilities/mocks/statement-fixtures';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { ResourceCard } from './resource-card';

const TREE = createResourceSummary('Tree', { label: 'Apple tree', description: 'A tree bearing apples', typeIri: 'http://x/Class', typeLabel: 'Class', usageCount: 1, position: { line: 4, character: 0 } });

/**
 * Render a card within a context.
 */
function renderCard(context: Partial<FormEditorContextValue> = {}, expanded = false, summary = TREE, writing = false) {
	const onToggle = vi.fn();
	const dataService = createResourceDataServiceStub([createTestResourceDetail([createProperty('rdfs:label', [createLiteralView('Apple tree')]), createProperty('ex:p', [createIriView('ex:A', 'A')])])].map(detail => ({ ...detail, term: summary.term })));
	const result = renderWebview(
		<FormEditorContext.Provider value={{ readOnly: true, namespaces: [], languageTags: {}, labelPredicates: [RdfDataFactory.namedNode(RDFS.label)], ...context }}>
			<ResourceCard summary={summary} dataService={dataService} expanded={expanded} writing={writing} onToggle={onToggle} />
		</FormEditorContext.Provider>
	);

	return { ...result, onToggle, dataService };
}

describe('ResourceCard', () => {
	it('leads a collapsed card with its title bar, holding the types and the usage count, then the label row with the kind icon and the label, and the description, and ends it with the IRI as a link', () => {
		const { container } = renderCard({ onOpenExternal: vi.fn() });
		const titleBar = container.querySelector<HTMLElement>('.resource-card-title-bar')!;
		const footer = container.querySelector<HTMLElement>('.resource-card-footer')!;

		expect(container.querySelector('.resource-card')?.firstElementChild).toBe(titleBar);
		expect(container.querySelector('.resource-card')?.lastElementChild).toBe(footer);
		expect(within(titleBar).getByText('Class').classList.contains('resource-card-types')).toBe(true);
		expect(within(titleBar).getByTitle('1 usage').classList.contains('card-usage')).toBe(true);
		expect(within(titleBar).getByRole('button', { name: 'Expand' }).getAttribute('aria-expanded')).toBe('false');
		expect(within(titleBar).queryByRole('button', { name: /all nested/ })).toBeNull();
		expect(within(footer).getByRole('button', { name: TREE.term.value }).classList.contains('resource-card-iri-link')).toBe(true);
		expect(screen.getByText('Apple tree').closest('.resource-card-header')).not.toBeNull();
		expect(container.querySelector('.resource-card-header .statement-predicate')).toBeNull();
		expect(container.querySelector('.resource-card-header .resource-card-kind vscode-icon')?.getAttribute('data-icon')).toBe('mentor-rdf-class');
		expect(screen.getByText('A tree bearing apples').classList.contains('resource-card-description')).toBe(true);
	});

	it('names every type of a collapsed card but the one most resources have, opens its IRI from the footer and reveals it in the editor from the ⋯ menu', async () => {
		const onOpenExternal = vi.fn();
		const onRevealInTextEditor = vi.fn();
		const { container } = renderCard({ dominantTypeIri: 'http://x/Class', onOpenExternal, onRevealInTextEditor }, false, { ...TREE, typeLabels: ['Class', 'Named individual'] });

		expect(container.querySelector('.resource-card-types')?.textContent).toBe('Named individual');

		await userEvent.click(screen.getByRole('button', { name: TREE.term.value }));
		await act(async () => {
			container.querySelector('.resource-card-menu vscode-context-menu')!.dispatchEvent(new CustomEvent('vsc-context-menu-select', { detail: { value: 'reveal' } }));
		});

		expect(onOpenExternal).toHaveBeenCalledWith(TREE.term.value);
		expect(onRevealInTextEditor).toHaveBeenCalledWith({ line: 4, character: 0 });
	});

	it('leaves the dominant type unsaid, dims a resource without a stated label and marks the matches of the filter', () => {
		renderCard({ dominantTypeIri: 'http://x/Class', filterText: 'apple' }, false, { ...TREE, hasLabel: false });

		expect(screen.queryByText('Class')).toBeNull();
		expect(screen.getByText('Apple', { selector: 'mark' }).closest('.resource-card-label')?.classList.contains('is-unnamed')).toBe(true);
		expect(screen.getByText('apple', { selector: 'mark' })).toBeTruthy();
	});

	it('expands from the label row, with the pointer and the keyboard, and from the chevron of the title bar', async () => {
		const { container, onToggle } = renderCard();
		const header = container.querySelector<HTMLElement>('.resource-card-header')!;

		await userEvent.click(header);
		header.focus();
		await userEvent.keyboard('{Enter}');
		await userEvent.click(screen.getByRole('button', { name: 'Expand' }));

		expect(onToggle).toHaveBeenCalledTimes(3);
		expect(onToggle).toHaveBeenCalledWith(TREE.term);
	});

	it('leads an expanded card with its label row after the title bar, whose chevron collapses the card', async () => {
		const { container, onToggle } = renderCard({}, true);
		const labelRow = screen.getByRole('group', { name: 'Label' });

		expect(container.querySelector('.resource-card-header')).toBeNull();
		expect(container.querySelector('.statement-line')).toBe(labelRow);
		expect(labelRow.querySelector('.statement-predicate')?.textContent).toBe('rdfs:label');
		expect(labelRow.textContent).toContain('Apple tree');
		expect(labelRow.querySelector('.card-usage')).toBeNull();
		expect(screen.queryByRole('group', { name: 'rdfs:label' })).toBeNull();
		expect(container.querySelector('.resource-card-title-bar .card-usage')?.textContent).toBe('1 usage');

		await userEvent.click(screen.getByRole('button', { name: 'Collapse' }));

		expect(onToggle).toHaveBeenCalledWith(TREE.term);
	});

	it('expands and collapses every nested card of an expanded card from the title bar, the nested cards starting collapsed', async () => {
		const { container } = renderCard({}, true);

		expect(container.querySelector('.resource-card-title-bar .add-link')).toBeNull();
		expect(screen.getByRole('button', { name: 'Expand all nested' })).toBeTruthy();

		await userEvent.click(screen.getByRole('button', { name: 'Expand all nested' }));

		expect(screen.getByRole('button', { name: 'Collapse all nested' })).toBeTruthy();
	});

	it('leaves out the description, the usage count and the reveal button of a resource without them', () => {
		const { container } = renderCard({ onRevealInTextEditor: vi.fn() }, false, createResourceSummary('Bare'));

		expect(container.querySelector('.resource-card-description')).toBeNull();
		expect(container.querySelector('.card-usage')).toBeNull();
		expect(screen.queryByRole('button', { name: 'More actions' })).toBeNull();
	});

	it('removes the card by Ctrl+Shift+K from its title bar, and not from a row', async () => {
		const onRemoveResource = vi.fn();
		const { container } = renderCard({ readOnly: false, onRemoveResource }, true);

		fireEvent.keyDown(container.querySelector('.resource-card-title-bar button')!, { key: 'K', ctrlKey: true, shiftKey: true });
		fireEvent.keyDown(container.querySelector('.statement-line')!, { key: 'K', ctrlKey: true, shiftKey: true });

		expect(onRemoveResource.mock.calls).toEqual([[TREE.term]]);
	});

	it('marks the revealed card', () => {
		const { container } = renderCard({ revealedResource: TREE.term });

		expect(container.querySelector('.resource-card')?.classList.contains('is-current')).toBe(true);
	});

	it('keeps the statements of a collapsed card mounted, hidden, while their writes are not done', () => {
		const { container } = renderCard({}, false, TREE, true);
		const list = container.querySelector('.statement-list');

		expect(list).not.toBeNull();
		expect(list?.parentElement?.hidden).toBe(true);
	});

	it('shows no statements in a collapsed card without writes', () => {
		const { container } = renderCard();

		expect(container.querySelector('.statement-list')).toBeNull();
	});
});

