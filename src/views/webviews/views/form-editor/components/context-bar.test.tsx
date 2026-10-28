// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { ContextBar } from './context-bar';

describe('ContextBar', () => {
	it('names the document and the entry under the top of the view with its place in the list', async () => {
		const onActivate = vi.fn();

		renderWebview(<ContextBar visible title="Plants" iconName="mentor-rdf-ontology" guideWord="Apple tree" position={3} count={12} filtering={false} onActivate={onActivate} />);

		expect(screen.getByText('Apple tree')?.classList.contains('context-bar-guide')).toBe(true);
		expect(screen.getByText(/3 of 12/)).toBeTruthy();

		await userEvent.click(screen.getByTitle('Back to the top'));

		expect(onActivate).toHaveBeenCalled();
	});

	it('counts matches while filtering and stays out of the way while hidden', () => {
		const { container } = renderWebview(<ContextBar visible={false} title="Plants" count={4} filtering onActivate={() => undefined} />);

		expect(screen.getByText('4 matches')).toBeTruthy();
		expect(container.querySelector('.context-bar')?.classList.contains('is-visible')).toBe(false);
		expect(screen.getByTitle('Back to the top').tabIndex).toBe(-1);
	});
});
