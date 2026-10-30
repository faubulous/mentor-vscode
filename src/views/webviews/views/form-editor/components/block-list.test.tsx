// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { createResourceDataServiceStub } from '@src/utilities/mocks/resource-data-service-fixtures';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { createResourceSummary } from '@src/utilities/mocks/resource-summary-fixtures';
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

const RESOURCES = Array.from({ length: 200 }, (_, index) => createResourceSummary(`Thing${index}`, { comments: index === 0 ? [['About the file']] : undefined }));

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
				<FormEditorContext.Provider value={{ readOnly: true, namespaces: [] }}>
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
		expect(dataService.requested[0]).toBe(RESOURCES[0].id);
	});
});
