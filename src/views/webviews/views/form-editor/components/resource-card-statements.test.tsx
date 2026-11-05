// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { RDFS } from '@faubulous/mentor-rdf';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
import { createSampleResourceDetail, TEST_SUBJECT } from '@src/utilities/mocks/statement-fixtures';
import { FormEditorContext } from '../state/form-editor-context';
import { ResourceCard } from './resource-card';

const TREE = createResourceSummary('Tree', { term: TEST_SUBJECT });

describe('ResourceCard statements', () => {
	it('shows the statements of an expanded card once they are loaded, and says so until then', () => {
		const loaded = createResourceDataServiceStub([createSampleResourceDetail()]);
		const empty = createResourceDataServiceStub();

		renderWebview(
			<FormEditorContext.Provider value={{ readOnly: true, namespaces: [], languageTags: {}, labelPredicates: [RdfDataFactory.namedNode(RDFS.label)] }}>
				<ResourceCard summary={TREE} dataService={loaded} expanded onToggle={() => undefined} />
				<ResourceCard summary={TREE} dataService={empty} expanded onToggle={() => undefined} />
				<ResourceCard summary={TREE} dataService={loaded} expanded={false} onToggle={() => undefined} />
			</FormEditorContext.Provider>
		);

		expect(screen.getAllByRole('group').map(row => row.getAttribute('aria-label'))).toEqual(['Label', 'rdf:type', 'rdfs:subClassOf']);
		expect(screen.getByText('Loading…').closest('.resource-card-body')).not.toBeNull();
		expect(document.querySelectorAll('.statement-list')).toHaveLength(1);
	});
});
