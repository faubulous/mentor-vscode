// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { createSampleResourceDetail, TEST_SUBJECT_ID } from '@src/utilities/mocks/statement-fixtures';
import { FormEditorContext } from '../state/form-editor-context';
import { ResourceCard } from './resource-card';

const TREE = createResourceSummary('Tree', { id: TEST_SUBJECT_ID });

describe('ResourceCard statements', () => {
	it('shows the statements of an expanded card once they are loaded, and says so until then', () => {
		const loaded = createResourceDataServiceStub([createSampleResourceDetail()]);
		const empty = createResourceDataServiceStub();

		renderWebview(
			<FormEditorContext.Provider value={{ readOnly: true, namespaces: [] }}>
				<ResourceCard summary={TREE} dataService={loaded} expanded onToggle={() => undefined} />
				<ResourceCard summary={TREE} dataService={empty} expanded onToggle={() => undefined} />
				<ResourceCard summary={TREE} dataService={loaded} expanded={false} onToggle={() => undefined} />
			</FormEditorContext.Provider>
		);

		expect(screen.getAllByRole('group')).toHaveLength(3);
		expect(screen.getByText('Loading…').closest('.resource-card-body')).not.toBeNull();
		expect(document.querySelectorAll('.statement-list')).toHaveLength(1);
	});
});
