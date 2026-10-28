// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { FormErrorBoundary } from './form-error-boundary';
import { EmptyState, ProblemState, ReadOnlyBanner } from './resource-list-states';

const READ_ONLY = { reason: 'syntaxErrors' as const, message: 'The document has syntax errors.' };

describe('resource list states', () => {
	it('shows the first problem of a document that cannot be shown and leads to it', async () => {
		const onRevealProblem = vi.fn();
		const problem = { message: 'Unexpected token', line: 3, character: 1 };

		renderWebview(<ProblemState readOnly={READ_ONLY} problems={[problem]} onRevealProblem={onRevealProblem} onOpenTextEditor={() => undefined} />);

		expect(screen.getByText('The document has syntax errors.')).toBeTruthy();
		expect(screen.getByText('Unexpected token')).toBeTruthy();

		await userEvent.click(screen.getByText('Go to Problem'));

		expect(onRevealProblem).toHaveBeenCalledWith(problem);
	});

	it('offers the text editor from the empty state and the banner', async () => {
		const onOpenTextEditor = vi.fn();

		renderWebview(<><EmptyState onOpenTextEditor={onOpenTextEditor} /><ReadOnlyBanner readOnly={READ_ONLY} onOpenTextEditor={onOpenTextEditor} /></>);

		for (const button of screen.getAllByText('Open in Text Editor')) {
			await userEvent.click(button);
		}

		expect(onOpenTextEditor).toHaveBeenCalledTimes(2);
	});
});

/**
 * A component that fails to render.
 */
function Broken(): React.JSX.Element {
	throw new Error('boom');
}

describe('FormErrorBoundary', () => {
	it('says what stopped the form and offers the text editor', () => {
		vi.spyOn(console, 'error').mockImplementation(() => undefined);

		renderWebview(<FormErrorBoundary onOpenTextEditor={() => undefined} resetKey={1}><Broken /></FormErrorBoundary>);

		expect(screen.getByRole('alert').textContent).toContain('The form could not be shown: boom');

		vi.restoreAllMocks();
	});
});
