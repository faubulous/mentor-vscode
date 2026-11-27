// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { act, fireEvent, screen, within } from '@testing-library/react';
import { RDFS } from '@faubulous/mentor-rdf';
import { createEditingHostStub } from '@src/utilities/mocks/editing-host-fixtures';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { TEST_NAMESPACES, TEST_SUBJECT, createIriView, createLiteralView, createProperty, createTestCardBody, withAnchors } from '@src/utilities/mocks/statement-fixtures';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { ResourceCardBodyData } from '../form-editor-model';
import { EditingController } from '../state/editing-controller';
import { FormEditorContext, FormEditorContextValue } from '../state/form-editor-context';
import { CommentBlock } from './comment-block';
import { StatementList } from './statement-list';

const NAMESPACES = Object.entries(TEST_NAMESPACES).map(([prefix, iri]) => ({ prefix, iri }));

/**
 * The context of a form that can write its document, through a controller over a recording host.
 */
function editableContext() {
	const host = createEditingHostStub();
	const context: FormEditorContextValue = { readOnly: false, editing: new EditingController(host), namespaces: NAMESPACES, languageTags: {}, resources: [] };

	return { host, context };
}

/**
 * Render the statements of a resource in a form that can write them.
 * @param cardBody The statements.
 * @param others The statements of the blank nodes they hold.
 */
function renderList(cardBody: ResourceCardBodyData, others: ResourceCardBodyData[] = []) {
	const { host, context } = editableContext();
	const dataService = createResourceDataServiceStub([cardBody, ...others]);

	renderWebview(
		<FormEditorContext.Provider value={context}>
			<StatementList cardBody={cardBody} dataService={dataService} depth={0} visited={[cardBody.subject]} />
		</FormEditorContext.Provider>
	);

	return { host };
}

/**
 * Type a text into a comment field and leave it.
 * @param field The text area of the field.
 * @param text The text.
 */
async function write(field: HTMLElement, text: string): Promise<void> {
	await act(async () => {
		fireEvent.focus(field);
		fireEvent.change(field, { target: { value: text } });
		fireEvent.blur(field);
	});
}

describe('CommentField', () => {
	it('writes a comment between the cards in place, a line per comment line', async () => {
		const { host, context } = editableContext();
		const block = { kind: 'comment' as const, id: 'comment', lines: ['About the file'], anchor: { kind: 'resource' as const, subject: TEST_SUBJECT, run: 0 }, subject: TEST_SUBJECT };

		renderWebview(<FormEditorContext.Provider value={context}><CommentBlock block={block} version={1} /></FormEditorContext.Provider>);

		const field = screen.getByLabelText('Comment');

		expect((field as HTMLTextAreaElement).value).toBe('About the file');

		await write(field, 'About the file\nand more');

		expect(host.submitted.map(edit => edit.operations)).toEqual([[{ op: 'setComment', at: block.anchor, lines: ['About the file', 'and more'] }]]);
	});

	it('shows the text of a comment of a document the form cannot write', () => {
		const block = { kind: 'comment' as const, id: 'comment', lines: ['About the file'], anchor: { kind: 'document' as const, run: 0 }, subject: TEST_SUBJECT };

		renderWebview(<FormEditorContext.Provider value={{ readOnly: true, namespaces: [], languageTags: {} }}><CommentBlock block={block} version={1} /></FormEditorContext.Provider>);

		expect(screen.queryByLabelText('Comment')).toBeNull();
		expect(screen.getByText('About the file').classList.contains('comment-block-text')).toBe(true);
	});

	it('breaks the line of a property comment on Enter without writing the row, and gives up what was typed on Escape', async () => {
		const label = { ...createProperty('rdfs:label', [createLiteralView('Tree')]), comments: ['the name'] };
		const { host } = renderList(withAnchors(createTestCardBody([createProperty('rdfs:comment', [createLiteralView('x')]), label])));
		const field = screen.getByLabelText('Comment on the property') as HTMLTextAreaElement;

		await act(async () => {
			fireEvent.focus(field);
			fireEvent.change(field, { target: { value: 'the common name' } });
			fireEvent.keyDown(field, { key: 'Enter' });
		});

		expect(host.submitted).toEqual([]);

		await act(async () => {
			fireEvent.keyDown(field, { key: 'Escape' });
		});

		expect(field.value).toBe('the name');
		expect(host.submitted).toEqual([]);
	});

	it('writes a property comment, which Ctrl+Enter leaves', async () => {
		const label = { ...createProperty('rdfs:label', [createLiteralView('Tree')]), comments: ['the name'] };
		const { host } = renderList(withAnchors(createTestCardBody([createProperty('rdfs:comment', [createLiteralView('x')]), label])));
		const field = screen.getByLabelText('Comment on the property');

		await act(async () => {
			field.focus();
			fireEvent.change(field, { target: { value: 'the common name' } });
			fireEvent.keyDown(field, { key: 'Enter', ctrlKey: true });
		});

		expect(host.submitted[0].operations).toEqual([{ op: 'setComment', at: { kind: 'property', subject: TEST_SUBJECT, predicate: RDFS.label }, lines: ['the common name'] }]);
	});

	it('puts a pill with a comment on a line of its own under the comment, and writes the comment of that value', async () => {
		const cardBody = withAnchors(createTestCardBody([createProperty('rdfs:seeAlso', [createIriView('ex:A', 'A'), { ...createIriView('ex:B', 'B'), comments: ['about B'] }])]));
		const { host } = renderList(cardBody);
		const line = document.querySelector('.value-pill-line')!;
		const field = within(line as HTMLElement).getByLabelText('Comment on the value');

		expect(line.querySelector('.value-pill')?.textContent).toBe('B');

		await write(field, 'about B, edited');

		expect(host.submitted[0].operations).toEqual([{ op: 'setComment', at: { kind: 'value', subject: TEST_SUBJECT, predicate: RDFS.seeAlso, anchor: cardBody.predicates[0].values[1].anchor }, lines: ['about B, edited'] }]);
	});

	it('writes the comment at the head of a nested node in the caption of its card', async () => {
		const node = RdfDataFactory.blankNode('b1');
		const nested: ResourceCardBodyData = { subject: node, leadingComments: ['the node'], predicates: [createProperty('rdfs:comment', [createLiteralView('inside')])] };
		const cardBody = withAnchors(createTestCardBody([createProperty('ex:has', [{ term: node, editable: true, nested: { term: node, propertyCount: 1 } }])]));
		const { host } = renderList(cardBody, [nested]);

		await write(screen.getByLabelText('Comment on the node'), 'the node, edited');

		expect(host.submitted[0].operations).toEqual([{ op: 'setComment', at: { kind: 'node', subject: node }, lines: ['the node, edited'] }]);
	});

	describe('asked for with Ctrl+/', () => {
		const LABEL = withAnchors(createTestCardBody([createProperty('rdfs:comment', [createLiteralView('x')]), createProperty('rdfs:label', [createLiteralView('Tree'), createLiteralView('Baum', 'de')])]));

		/**
		 * Press Ctrl+/ in an element.
		 * @param element The element.
		 */
		async function pressComment(element: Element): Promise<void> {
			await act(async () => {
				fireEvent.keyDown(element, { key: '/', ctrlKey: true });
			});
		}

		it('opens an empty comment above the value whose field has the focus, which writes the comment of that value', async () => {
			const { host } = renderList(LABEL);

			await pressComment(screen.getByLabelText('Value 2'));

			const field = screen.getByLabelText('Comment on the value');

			expect(document.activeElement).toBe(field);
			expect(field.closest('.statement-value')?.querySelector('[data-value-index="1"]')).not.toBeNull();

			await write(field, 'the German name');

			expect(host.submitted[0].operations).toEqual([{ op: 'setComment', at: { kind: 'value', subject: TEST_SUBJECT, predicate: RDFS.label, anchor: LABEL.predicates[1].values[1].anchor }, lines: ['the German name'] }]);
			expect(screen.queryByLabelText('Comment on the value')).toBeNull();
		});

		it('opens an empty comment above the property from its predicate field, and writes nothing when left empty', async () => {
			const { host } = renderList(LABEL);
			const row = screen.getByRole('group', { name: 'rdfs:label' });

			await pressComment(row.querySelector('.statement-predicate .input-field')!);

			const field = screen.getByLabelText('Comment on the property');

			expect(document.activeElement).toBe(field);

			await act(async () => fireEvent.blur(field));

			expect(host.submitted).toEqual([]);
			expect(screen.queryByLabelText('Comment on the property')).toBeNull();
		});

		it('takes the focus to the comment a value has already', async () => {
			const cardBody = withAnchors(createTestCardBody([createProperty('rdfs:comment', [createLiteralView('x')]), createProperty('rdfs:label', [{ ...createLiteralView('Tree'), comments: ['the name'] }])]));

			renderList(cardBody);
			await pressComment(within(screen.getByRole('group', { name: 'rdfs:label' })).getByLabelText('Value 1'));

			expect(screen.getAllByLabelText('Comment on the value')).toHaveLength(1);
			expect(document.activeElement).toBe(screen.getByLabelText('Comment on the value'));
		});

		it('opens the comment above a nested card from its header', async () => {
			const node = RdfDataFactory.blankNode('b1');
			const nested: ResourceCardBodyData = { subject: node, predicates: [createProperty('rdfs:comment', [createLiteralView('inside')])] };
			const cardBody = withAnchors(createTestCardBody([createProperty('ex:has', [{ term: node, editable: true, nested: { term: node, propertyCount: 1 } }])]));
			const { host } = renderList(cardBody, [nested]);

			await pressComment(screen.getByRole('button', { name: 'Expand' }));
			await write(screen.getByLabelText('Comment on the value'), 'the node');

			expect(host.submitted[0].operations).toEqual([{ op: 'setComment', at: { kind: 'value', subject: TEST_SUBJECT, predicate: `${TEST_NAMESPACES.ex}has`, anchor: cardBody.predicates[0].values[0].anchor }, lines: ['the node'] }]);
		});
	});
});
