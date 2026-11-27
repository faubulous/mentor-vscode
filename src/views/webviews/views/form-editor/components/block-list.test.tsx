// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { createEditingHostStub } from '@src/utilities/mocks/editing-host-fixtures';
import { EditingController } from '../state/editing-controller';
import { FormBlock } from '../state/form-block';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceListItem } from '@src/utilities/mocks/resource-list-item-fixtures';
import { FormEditorContext } from '../state/form-editor-context';
import { ResourceCardStates } from '../state/resource-card-states';
import { buildFormBlocks } from '../hooks/use-form-blocks';
import { BlockList } from './block-list';

/**
 * A resize observer for jsdom, which reports the size an element claims through its bounding rectangle.
 */
class FakeResizeObserver {
	constructor(private readonly _callback: ResizeObserverCallback) { }

	observe(target: Element): void {
		this._callback([{ target, contentRect: target.getBoundingClientRect() } as ResizeObserverEntry], this as unknown as ResizeObserver);
	}

	unobserve(): void { }

	disconnect(): void { }
}

/**
 * Make a scroll container of a given height.
 */
function createScrollElement(height: number): HTMLDivElement {
	const element = document.createElement('div');

	element.getBoundingClientRect = () => ({ top: 0, left: 0, width: 800, height, bottom: height, right: 800, x: 0, y: 0, toJSON: () => undefined });
	Object.defineProperty(element, 'clientHeight', { value: height });
	Object.defineProperty(element, 'scrollHeight', { value: 10000 });
	document.body.appendChild(element);

	return element;
}

const RESOURCES = Array.from({ length: 200 }, (_, index) => createResourceListItem(`Thing${index}`, { comments: index === 0 ? [['About the file']] : undefined }));

describe('BlockList', () => {
	const offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');

	beforeEach(() => {
		vi.stubGlobal('ResizeObserver', FakeResizeObserver);
		// jsdom lays nothing out: every row claims the height of a collapsed entry.
		Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
			configurable: true,
			get(this: HTMLElement) {
				return this.classList.contains('form-block') ? 66 : 0;
			}
		});
	});

	afterEach(() => {
		if (offsetHeight) {
			Object.defineProperty(HTMLElement.prototype, 'offsetHeight', offsetHeight);
		}

		vi.unstubAllGlobals();
	});

	it('renders the rows of the window only and asks for the statements around it', async () => {
		const dataService = createResourceDataServiceStub();
		const scrollElement = createScrollElement(600);
		const blocks = buildFormBlocks(RESOURCES, [['The end']], false);

		await act(async () => {
			renderWebview(
				<FormEditorContext.Provider value={{ readOnly: true, namespaces: [], languageTags: {} }}>
					<BlockList blocks={blocks} dataService={dataService} scrollElement={scrollElement} cardStates={ResourceCardStates.NONE} onToggle={() => undefined} />
				</FormEditorContext.Provider>
			);
		});

		const rendered = document.querySelectorAll('.form-block').length;

		expect(rendered).toBeGreaterThan(0);
		expect(rendered).toBeLessThan(blocks.length);
		expect(screen.getByText('About the file').className).toBe('comment-block-text');
		expect(document.querySelector('.form-block')?.getAttribute('data-block-id')).toBe(blocks[0].id);
		expect(dataService.requested.length).toBeGreaterThan(0);
		expect(dataService.requested.length).toBeLessThan(RESOURCES.length);
		expect(dataService.requested[0]).toBe(RESOURCES[0].subject);
	});

	describe('adding comments', () => {
		/**
		 * Render the first blocks of a short document in a form that can write it.
		 * @param filtering Whether a filter narrows the list.
		 * @returns The recording host and the blocks.
		 */
		async function renderEditable(filtering = false) {
			const host = createEditingHostStub();
			const blocks: FormBlock[] = buildFormBlocks(RESOURCES.slice(0, 2), [['The end']], filtering);

			await act(async () => {
				renderWebview(
					<FormEditorContext.Provider value={{ readOnly: false, editing: new EditingController(host), namespaces: [], languageTags: {} }}>
						<BlockList blocks={blocks} dataService={createResourceDataServiceStub()} scrollElement={createScrollElement(2000)} cardStates={ResourceCardStates.NONE} filtering={filtering} onToggle={() => undefined} />
					</FormEditorContext.Provider>
				);
			});

			return { host, blocks };
		}

		/**
		 * Type a comment into the field that is asked for and leave it.
		 * @param text The text.
		 */
		async function writeNewComment(text: string): Promise<void> {
			const field = screen.getByLabelText('New comment');

			expect(document.activeElement).toBe(field);

			await act(async () => {
				fireEvent.change(field, { target: { value: text } });
				fireEvent.blur(field);
			});
		}

		/**
		 * The link that adds a comment in the gap above a block.
		 * @param id The identifier of the block.
		 * @returns The link.
		 */
		function linkAbove(id: string): HTMLElement {
			return document.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(id)}"] > .block-add-comment`)!;
		}

		it('adds a comment directly above a resource from the gap above its card', async () => {
			const { host, blocks } = await renderEditable();

			await act(async () => fireEvent.click(linkAbove(blocks[2].id)));
			await writeNewComment('About Thing1');

			expect(host.submitted[0].operations).toEqual([{ op: 'addComment', before: { subject: RESOURCES[1].subject }, lines: ['About Thing1'] }]);
			expect(screen.queryByLabelText('New comment')).toBeNull();
		});

		it('adds a comment before a comment above a resource, and at the end of the document', async () => {
			const { host, blocks } = await renderEditable();

			await act(async () => fireEvent.click(linkAbove(blocks[0].id)));
			await writeNewComment('Before the file comment');
			// The data of the list stays at its version: the first comment is settled without a change of it.
			await act(async () => host.settle({ ok: true, version: 1 }));
			await act(async () => fireEvent.click(document.querySelector<HTMLElement>('.block-list-add-comment')!));
			await writeNewComment('The very end');

			expect(host.submitted.map(edit => edit.operations[0])).toEqual([
				{ op: 'addComment', before: { subject: RESOURCES[0].subject, run: 0 }, lines: ['Before the file comment'] },
				{ op: 'addComment', before: undefined, lines: ['The very end'] }
			]);
		});

		it('writes nothing for a comment left empty, and offers none above the comments closing the document', async () => {
			const { host, blocks } = await renderEditable();

			await act(async () => fireEvent.click(linkAbove(blocks[2].id)));
			await act(async () => fireEvent.blur(screen.getByLabelText('New comment')));

			expect(host.submitted).toEqual([]);
			expect(linkAbove(blocks[blocks.length - 1].id)).toBeNull();
		});

		it('offers no comment while a filter narrows the list', async () => {
			await renderEditable(true);

			expect(document.querySelector('.block-add-comment, .block-list-add-comment')).toBeNull();
		});
	});
});
