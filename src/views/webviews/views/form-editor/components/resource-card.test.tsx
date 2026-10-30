// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { createIriView, createProperty, createTestResourceDetail } from '@src/utilities/mocks/statement-fixtures';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { ResourceCard } from './resource-card';

const TREE = createResourceSummary('Tree', { label: 'Apple tree', description: 'A tree bearing apples', typeIri: 'http://x/Class', typeLabel: 'Class', usageCount: 1 });

/**
 * Render a card within a context.
 */
function renderCard(context: Partial<FormEditorContextValue> = {}, expanded = false, summary = TREE, writing = false) {
	const onToggle = vi.fn();
	const dataService = createResourceDataServiceStub([createTestResourceDetail([createProperty('ex:p', [createIriView('ex:A', 'A')])])].map(detail => ({ ...detail, id: summary.id })));
	const result = renderWebview(
		<FormEditorContext.Provider value={{ readOnly: true, namespaces: [], ...context }}>
			<ResourceCard summary={summary} dataService={dataService} expanded={expanded} writing={writing} onToggle={onToggle} />
		</FormEditorContext.Provider>
	);

	return { ...result, onToggle, dataService };
}

describe('ResourceCard', () => {
	it('puts the label and the type in the header, the description in the body and the usage count in the footer', () => {
		renderCard();

		expect(screen.getByText('Apple tree').closest('.resource-card-header')).not.toBeNull();
		expect(screen.getByText('Class').closest('.resource-card-header')).not.toBeNull();
		expect(screen.getByText('A tree bearing apples').closest('.resource-card-body')).not.toBeNull();
		expect(screen.getByText('1 usage').closest('.resource-card-footer')).not.toBeNull();
	});

	it('leaves the dominant type unsaid, dims a resource without a stated label and marks the matches of the filter', () => {
		renderCard({ dominantTypeIri: 'http://x/Class', filterText: 'apple' }, false, { ...TREE, hasLabel: false });

		expect(screen.queryByText('Class')).toBeNull();
		expect(screen.getByText('Apple', { selector: 'mark' }).closest('.resource-card-label')?.classList.contains('is-unnamed')).toBe(true);
		expect(screen.getByText('apple', { selector: 'mark' })).toBeTruthy();
	});

	it('toggles from the header, with the pointer and the keyboard, and shows the identifier once expanded', async () => {
		const { onToggle } = renderCard();
		const header = screen.getByRole('button', { expanded: false });

		await userEvent.click(header);
		header.focus();
		await userEvent.keyboard('{Enter}');

		expect(onToggle).toHaveBeenCalledTimes(2);
		expect(onToggle).toHaveBeenCalledWith(TREE.id);
		expect(screen.queryByText('ex:Tree')).toBeNull();

		renderCard({}, true);

		expect(screen.getByText('ex:Tree').classList.contains('resource-card-iri')).toBe(true);
		expect(screen.getByRole('button', { expanded: true })).toBeTruthy();
	});

	it('leaves out the body and the footer of a resource with nothing to put in them', () => {
		const { container } = renderCard({}, false, createResourceSummary('Bare'));

		expect(container.querySelector('.resource-card-body')).toBeNull();
		expect(container.querySelector('.resource-card-footer')).toBeNull();
	});

	it('marks the revealed card', () => {
		const { container } = renderCard({ revealedResourceId: TREE.id });

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

