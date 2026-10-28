// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { ResourceEntry } from './resource-entry';

const TREE = createResourceSummary('Tree', { label: 'Apple tree', description: 'A tree bearing apples', typeIri: 'http://x/Class', typeLabel: 'Class', usageCount: 1 });

/**
 * Render an entry within a context.
 */
function renderEntry(context: Partial<FormEditorContextValue> = {}, expanded = false) {
	const onToggle = vi.fn();
	const result = renderWebview(
		<FormEditorContext.Provider value={{ readOnly: true, namespaces: [], ...context }}>
			<ResourceEntry summary={TREE} expanded={expanded} onToggle={onToggle} />
		</FormEditorContext.Provider>
	);

	return { ...result, onToggle };
}

describe('ResourceEntry', () => {
	it('shows the headword, the type, the description and the usage count', () => {
		renderEntry();

		expect(screen.getByText('Apple tree')?.classList.contains('entry-headword')).toBe(true);
		expect(screen.getByText('Class')?.classList.contains('entry-type')).toBe(true);
		expect(screen.getByText('A tree bearing apples')).toBeTruthy();
		expect(screen.getByText('1 usage')).toBeTruthy();
	});

	it('leaves the dominant type unsaid and marks the matches of the filter', () => {
		renderEntry({ dominantTypeIri: 'http://x/Class', filterText: 'apple' });

		expect(screen.queryByText('Class')).toBeNull();
		expect(screen.getAllByText('apple', { selector: 'mark' })).toHaveLength(1);
		expect(screen.getAllByText('Apple', { selector: 'mark' })).toHaveLength(1);
	});

	it('toggles from the headword and the chevron, and shows the IRI once expanded', async () => {
		const { onToggle } = renderEntry();

		await userEvent.click(screen.getByText('Apple tree'));
		await userEvent.click(screen.getByLabelText('Expand resource'));

		expect(onToggle).toHaveBeenCalledTimes(2);
		expect(onToggle).toHaveBeenCalledWith(TREE.id);
		expect(screen.queryByText('ex:Tree')).toBeNull();

		renderEntry({}, true);

		expect(screen.getByText('ex:Tree')?.classList.contains('entry-iri')).toBe(true);
		expect(screen.getByLabelText('Collapse resource')).toBeTruthy();
	});

	it('marks the revealed entry', () => {
		const { container } = renderEntry({ revealedResourceId: TREE.id });

		expect(container.querySelector('.entry')?.classList.contains('is-current')).toBe(true);
	});
});
