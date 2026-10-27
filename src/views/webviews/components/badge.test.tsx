// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { Badge } from './badge';

describe('Badge', () => {
	it('shows its content as a pill', () => {
		renderWebview(<Badge>3 graphs</Badge>);

		const badge = screen.getByText('3 graphs');

		expect(badge.tagName).toBe('SPAN');
		expect(badge.className).toBe('item-badge');
	});

	it('carries a tooltip and a status class', () => {
		renderWebview(<Badge title="Two shapes failed" className="badge-error">2</Badge>);

		const badge = screen.getByTitle('Two shapes failed');

		expect(badge.textContent).toBe('2');
		expect(badge.classList.contains('badge-error')).toBe(true);
	});

	it('injects its stylesheet once', () => {
		renderWebview(<><Badge>a</Badge><Badge>b</Badge></>);

		expect(document.querySelectorAll('#badge-styles')).toHaveLength(1);
	});
});
