// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { useCallback, useEffect, useState } from 'react';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWebview } from '@src/utilities/mocks/webview-test-utils';
import { useWebviewMessaging } from './use-webview-messaging';

/**
 * The messages of the component under test.
 */
type GreetingMessages =
	| { id: 'Ready' }
	| { id: 'Greet'; name: string }
	| { id: 'Greeted'; greeting: string };

/**
 * A component that announces itself, greets who the host names, and reports back when clicked.
 */
function Greeter() {
	const [greeting, setGreeting] = useState('…');
	const onMessage = useCallback((message: GreetingMessages) => {
		if (message.id === 'Greet') {
			setGreeting(`Hello, ${message.name}!`);
		}
	}, []);
	const messaging = useWebviewMessaging<GreetingMessages>(onMessage);

	useEffect(() => {
		messaging?.postMessage({ id: 'Ready' });
	}, [messaging]);

	return (
		<vscode-button onClick={() => messaging?.postMessage({ id: 'Greeted', greeting })}>
			{greeting}
		</vscode-button>
	);
}

describe('useWebviewMessaging', () => {
	it('posts to the host and receives what the host sends', async () => {
		const { host } = renderWebview<GreetingMessages>(<Greeter />);

		expect(host.posted).toEqual([{ id: 'Ready' }]);

		act(() => host.receive({ id: 'Greet', name: 'Ada' }));

		expect(screen.getByText('Hello, Ada!')).toBeDefined();

		await userEvent.click(screen.getByText('Hello, Ada!'));

		expect(host.posted).toEqual([{ id: 'Ready' }, { id: 'Greeted', greeting: 'Hello, Ada!' }]);
	});

	it('records the messages of each render separately', () => {
		const first = renderWebview<GreetingMessages>(<Greeter />);
		const second = renderWebview<GreetingMessages>(<Greeter />);

		expect(first.host.posted).toEqual([{ id: 'Ready' }]);
		expect(second.host.posted).toEqual([{ id: 'Ready' }]);
	});
});
