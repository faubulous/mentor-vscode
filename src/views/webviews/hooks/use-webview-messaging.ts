import { useEffect, useRef } from 'react';
import { WebviewMessaging, WebviewMessage } from '../webview-messaging';
import { WebviewHost } from '../webview-host';

/**
 * React hook for webview messaging. Provides the full messaging interface including
 * `postMessage`, `onMessage`, and `executeCommand`.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const messaging = useWebviewMessaging<MyMessages>(message => {
 *     if (message.id === 'DataLoaded') {
 *       setData(message.data);
 *     }
 *   });
 *
 *   const handleClick = () => {
 *     messaging?.postMessage({ id: 'LoadData' });
 *   };
 * }
 * ```
 *
 * @param onMessage Callback invoked when a message is received from the extension host.
 * @param messaging Optional custom messaging instance. If not provided, uses WebviewHost (must be in webview context).
 * @returns The WebviewMessaging interface, or undefined if not in a webview context and no messaging was provided.
 */
export function useWebviewMessaging<M extends WebviewMessage>(
	onMessage?: (message: M) => void,
	messaging?: WebviewMessaging<M>
): WebviewMessaging<M> | undefined {
	const messagingRef = useRef<WebviewMessaging<M> | undefined>(
		messaging ?? (WebviewHost.isAvailable() ? WebviewHost.getMessaging<M>() : undefined)
	);

	useEffect(() => {
		if (onMessage && messagingRef.current) {
			return messagingRef.current.onMessage(onMessage);
		}
	}, [onMessage]);

	return messagingRef.current;
}
