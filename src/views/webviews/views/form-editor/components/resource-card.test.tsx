// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { RDFS } from '@faubulous/mentor-rdf';
import { createIriView, createLiteralView, createProperty, createTestResourceDetail } from '@src/utilities/mocks/statement-fixtures';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { ResourceCard } from './resource-card';

const TREE = createResourceSummary('Tree', { label: 'Apple tree', description: 'A tree bearing apples', typeIri: 'http://x/Class', typeLabel: 'Class', usageCount: 1 });

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
	it('puts the label, the type and the usage count in the header of a collapsed card, and the description and the identifier under it', () => {
		renderCard();

		expect(screen.getByText('Apple tree').closest('.resource-card-header')).not.toBeNull();
		expect(screen.getByText('Class').closest('.resource-card-header')).not.toBeNull();
		expect(screen.getByText('1 usage').closest('.resource-card-header')).not.toBeNull();
		expect(screen.getByText('A tree bearing apples').classList.contains('resource-card-description')).toBe(true);
		expect(screen.getByText('ex:Tree').classList.contains('resource-card-iri')).toBe(true);
	});

	it('leaves the dominant type unsaid, dims a resource without a stated label and marks the matches of the filter', () => {
		renderCard({ dominantTypeIri: 'http://x/Class', filterText: 'apple' }, false, { ...TREE, hasLabel: false });

		expect(screen.queryByText('Class')).toBeNull();
		expect(screen.getByText('Apple', { selector: 'mark' }).closest('.resource-card-label')?.classList.contains('is-unnamed')).toBe(true);
		expect(screen.getByText('apple', { selector: 'mark' })).toBeTruthy();
	});

	it('expands from the header, with the pointer and the keyboard', async () => {
		const { onToggle } = renderCard();
		const header = screen.getByRole('button', { expanded: false });

		await userEvent.click(header);
		header.focus();
		await userEvent.keyboard('{Enter}');

		expect(onToggle).toHaveBeenCalledTimes(2);
		expect(onToggle).toHaveBeenCalledWith(TREE.term);
	});

	it('leads an expanded card with its label row, whose button collapses the card, and ends it with the identifier', async () => {
		const { container, onToggle } = renderCard({}, true);
		const labelRow = screen.getByRole('group', { name: 'Label' });

		expect(container.querySelector('.resource-card-header')).toBeNull();
		expect(container.querySelector('.statement-line')).toBe(labelRow);
		expect(labelRow.querySelector('.statement-predicate')?.textContent).toBe('label');
		expect(labelRow.textContent).toContain('Apple tree');
		expect(labelRow.querySelector('.card-usage')?.textContent).toBe('1 usage');
		expect(screen.queryByRole('group', { name: 'rdfs:label' })).toBeNull();
		expect(container.querySelector('.resource-card')?.lastElementChild?.textContent).toBe('ex:Tree');

		await userEvent.click(screen.getByRole('button', { name: 'Collapse' }));

		expect(onToggle).toHaveBeenCalledWith(TREE.term);
	});

	it('leaves out the description and the usage count of a resource without them', () => {
		const { container } = renderCard({}, false, createResourceSummary('Bare'));

		expect(container.querySelector('.resource-card-description')).toBeNull();
		expect(container.querySelector('.card-usage')).toBeNull();
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

